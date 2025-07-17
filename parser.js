// parser.bun.js

// Import Bun's built-in FFI module. No external packages are needed.
import { dlopen, CString, ptr, toBuffer } from 'bun:ffi';
import path from 'path';
import os from 'os';
import { statSync } from 'fs';

// --- 1. Locate the shared library ---
// This function determines the correct library file based on the OS.
function getLibraryPath() {
  const platform = os.platform();
  const root = path.join(import.meta.dir, 'statedb-x86_64-linux', 'lib');

  switch (platform) {
    case 'win32':
      // On Windows, Zig places the .dll in zig-out/bin
      return path.join(import.meta.dir, 'zig-out', 'bin', 'statedb_parser.dll');
    case 'darwin': // macOS
      return path.join(root, 'libstatedb_parser.dylib');
    case 'linux':
      return path.join(root, 'libstatedb_parser.so');
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

const libPath = getLibraryPath();
// const libPath = "/workspaces/ubuntu/libduckdb-linux-amd64/libduckdb.so";
console.log(`Attempting to load library from: ${libPath}`);

// Check if the library file exists before trying to load it.
try {
  statSync(libPath);
} catch (e) {
  console.error("Library file not found!");
  console.error("Please build the library first with: zig build lib");
  process.exit(1);
}

// --- 2. Define the FFI interface and load the library ---
// `dlopen` opens the shared library and lets us access its exported symbols.
const lib = dlopen(libPath, {
  parse_command: {
    // The function takes a pointer to a buffer (our string)
    // and returns a pointer (the address of the ParseResult struct).
    args: ['ptr'],
    returns: 'ptr',
  },
  free_parse_result: {
    // This function takes a pointer and returns nothing.
    args: ['ptr'],
    returns: 'void',
  },
});

// --- 3. Main execution logic ---
function main() {
  console.log('\n--- Testing StateDB Parser FFI with Bun ---');

  const respCommand = '*3\r\n$3\r\nSET\r\n$5\r\nmykey\r\n$7\r\nmyvalue\r\n';
  let resultPtr = null;

  try {
    // Convert the JS string to a null-terminated buffer for C compatibility.
    const inputBuffer = toBuffer(respCommand + '\0');

    // Call the Zig function. It returns a raw pointer (a number).
    console.log(`\nSending command to Zig: "${respCommand.replace(/\r\n/g, '\\r\\n')}"`);
    resultPtr = lib.symbols.parse_command(ptr(inputBuffer));

    if (resultPtr === null) {
      throw new Error("Zig function returned a null pointer.");
    }
    
    console.log(`\nReceived result pointer from Zig: ${resultPtr}`);

    // --- Manually read data from the C struct pointer ---
    // This is the main difference from the Node.js ffi-napi version.
    // We know the struct layout: bool (1 byte), char* (8 bytes), char* (8 bytes) on 64-bit.
    
    // Read the first byte to get the 'success' boolean.
    const success = new Uint8Array(ptr(resultPtr).buffer, 0, 1)[0] === 1;
    console.log(`  Success: ${success}`);

    // Read the two pointers that follow the boolean.
    // We start at an offset of 8 bytes (to skip the bool and padding).
    // Pointers are 64-bit (8 bytes) on a 64-bit system.
    const pointerBuffer = new BigUint64Array(ptr(resultPtr).buffer, 8, 2);
    const errPtr = pointerBuffer[0];
    const jsonResultPtr = pointerBuffer[1];

    if (success) {
      // If successful, the json_result pointer is valid.
      // Convert the C string pointer to a JavaScript string.
      const jsonString = new CString(jsonResultPtr);
      console.log(`  JSON Result: ${jsonString}`);
      const parsedJson = JSON.parse(jsonString);
      console.log('  Parsed JSON Object:', parsedJson);
    } else {
      // If it failed, the err pointer is valid.
      console.error(`  Error: ${new CString(errPtr)}`);
    }

  } catch (e) {
    console.error('An error occurred during FFI call:', e);
  } finally {
    // --- 4. CRITICAL: Free the memory ---
    // If the pointer is not null, we MUST call the Zig `free` function
    // to prevent a memory leak.
    if (resultPtr) {
      console.log('\nCalling Zig to free the allocated memory...');
      lib.symbols.free_parse_result(resultPtr);
      console.log('Memory freed.');
    }
  }
}

main();
