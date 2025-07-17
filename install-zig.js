// install-zig.js

import { $ } from "bun";
import os from "os";
import path from "path";
import fs from "fs/promises";

// The URL to fetch the list of community-run mirrors.
const MIRRORS_URL = 'https://ziglang.org/download/community-mirrors.txt';
// The directory where Zig will be installed.
const INSTALL_DIR = "/usr/local";


/**
 * Determines the correct Zig package information for the current environment.
 * @param {string} zigVersion - The version of Zig to install.
 * @returns {{tarballName: string, unpackedDirName: string, canonicalUrl: string}}
 */
function getZigPackageInfo(zigVersion) {
  const platform = os.platform();
  const arch = os.arch();

  let os_target = "";
  if (platform === "linux") os_target = "linux";
  else if (platform === "darwin") os_target = "macos";
  else if (platform === "win32") os_target = "windows";
  else throw new Error(`Unsupported platform: ${platform}`);

  let arch_target = "";
  if (arch === "x64") arch_target = "x86_64";
  else if (arch === "arm64") arch_target = "aarch64";
  else throw new Error(`Unsupported architecture: ${arch}`);
  
  const baseName = `zig-${os_target}-${arch_target}-${zigVersion}`;
  const extension = (os_target === 'windows') ? 'zip' : 'tar.xz';
  const tarballName = `${baseName}.${extension}`;
  
  return {
    tarballName: tarballName,
    unpackedDirName: baseName,
    canonicalUrl: `https://ziglang.org/builds/${tarballName}`,
  };
}

/**
 * Attempts to download a file from a list of URLs, trying each one until success.
 * @param {string[]} urls - An array of URLs to try.
 * @param {string} outputFilename - The name of the file to save.
 */
async function resilientDownload(urls, outputFilename) {
    let downloadSucceeded = false;
    for (const url of urls) {
        console.log(`      Attempting download from: ${url}`);
        // Use Bun's shell to run wget. The `-O` flag specifies the output file.
        // The process execution will throw an error if the exit code is non-zero.
        try {
            await $`wget --quiet -O ${outputFilename} ${url}`.quiet();
            console.log(`      Download successful from: ${url}`);
            downloadSucceeded = true;
            break; // Exit the loop on first success
        } catch (e) {
            console.warn(`      Failed to download from ${url}. Trying next mirror...`);
        }
    }

    if (!downloadSucceeded) {
        throw new Error("Failed to download Zig from all available mirrors and the canonical source.");
    }
}


/**
 * Main function to download and install Zig.
 */
async function main() {
  console.log("--- Zig Setup Script for Bun ---");

  // 1. Get Zig version from command-line arguments.
  const zigVersion = process.argv[2];
  if (!zigVersion) {
    console.error("Error: Please provide the Zig version as a command-line argument.");
    console.error("Usage: bun install-zig.js <version>");
    console.error("Example: bun install-zig.js 0.14.0-dev.2837+f38d7a92c");
    process.exit(1);
  }
  console.log(`[1/5] Target Zig version: ${zigVersion}`);

  // 2. Determine package info.
  const { tarballName, unpackedDirName, canonicalUrl } = getZigPackageInfo(zigVersion);
  const finalInstallPath = path.join(INSTALL_DIR, unpackedDirName);
  console.log(`[2/5] Determined target package: ${tarballName}`);

  // 3. Fetch mirrors and attempt download.
  console.log("[3/5] Fetching mirrors and downloading Zig archive...");
  let mirrors = [];
  try {
      const response = await fetch(MIRRORS_URL);
      if (response.ok) {
          mirrors = (await response.text()).split('\n').filter(url => url.length > 0);
          console.log(`      Found ${mirrors.length} community mirrors.`);
      }
  } catch (e) {
      console.warn("      Could not fetch community mirrors. Will use the official URL as a fallback.");
  }
  
  // Create a shuffled list of URLs to try, with the official URL as the last resort.
  const shuffledMirrors = mirrors.sort(() => 0.5 - Math.random());
  const downloadUrls = [...shuffledMirrors.map(m => `${m}/${tarballName}`), canonicalUrl];
  
  await resilientDownload(downloadUrls, tarballName);

  // 4. Extract the archive.
  console.log(`[4/5] Extracting archive to ${INSTALL_DIR}...`);
  await $`tar -xf ${tarballName} -C ${INSTALL_DIR}`;
  console.log("      Extraction complete.");

  // 5. Clean up the downloaded archive.
  console.log("[5/5] Cleaning up downloaded file...");
  await fs.unlink(tarballName);
  console.log("      Cleanup complete.");

  console.log("\n--- Zig Installation Successful! ---");
  console.log(`Zig is installed at: ${finalInstallPath}`);
  console.log("\nTo use it, you need to add it to your PATH.");
  console.log("You can do this by adding the following line to your ~/.bashrc or ~/.zshrc file:");
  console.log(`\n  export PATH="${finalInstallPath}:$PATH"\n`);
}

// Run the main function and handle any errors.
main().catch(err => {
  console.error("\nAn error occurred during installation:", err.message);
  process.exit(1);
});
