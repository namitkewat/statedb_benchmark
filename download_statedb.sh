#!/bin/bash

# A script to download and extract the latest Linux release of statedb
# from GitHub into a clean 'release' directory.
#
# It requires `curl`, `jq`, and `unzip` to be installed.
# To install them on Ubuntu/Debian:
# sudo apt update && sudo apt install -y curl jq unzip

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
# The GitHub repository in the format "owner/repo"
REPO="namitkewat/statedb"
# The keyword to identify the correct asset for Linux
ASSET_KEYWORD="linux"
# The directory where the release will be downloaded and extracted.
TARGET_DIR="release"

# --- Script ---

echo "Checking for required tools (curl, jq, unzip)..."
for tool in curl jq unzip; do
  if ! command -v $tool &> /dev/null; then
    echo "Error: $tool is not installed. Please install it to continue."
    echo "On Ubuntu/Debian, run: sudo apt install -y $tool"
    exit 1
  fi
done
echo "All required tools are present."
echo ""

# --- FIX: Clean and create the target directory ---
echo "Preparing target directory: $TARGET_DIR..."
# Remove the directory if it exists to ensure a clean start.
if [ -d "$TARGET_DIR" ]; then
    rm -rf "$TARGET_DIR"
fi
# Create a new, empty directory.
mkdir "$TARGET_DIR"
echo "Directory '$TARGET_DIR' is ready."
echo ""


echo "Fetching latest release information for $REPO..."

# Use the GitHub API to get the latest release data.
# The '-s' flag for curl makes it silent (no progress meter).
API_URL="https://api.github.com/repos/$REPO/releases/latest"
RELEASE_DATA=$(curl -s "$API_URL")

# Use jq to parse the JSON response and find the download URL for the Linux asset.
DOWNLOAD_URL=$(echo "$RELEASE_DATA" | jq -r --arg KEYWORD "$ASSET_KEYWORD" '.assets[] | select(.name | contains($KEYWORD)) | .browser_download_url')

# Check if a download URL was found. If not, the script exits.
if [[ -z "$DOWNLOAD_URL" ]]; then
  echo "Error: Could not find a Linux release asset for the latest version."
  echo "Please check the releases page manually: https://github.com/$REPO/releases"
  exit 1
fi

# Get the filename from the full URL
FILENAME=$(basename "$DOWNLOAD_URL")
# Define the full path for the downloaded file inside the target directory.
DOWNLOAD_PATH="$TARGET_DIR/$FILENAME"

echo "Found latest release file: $FILENAME"
echo "Downloading to: $DOWNLOAD_PATH"

# Download the file using curl.
# - '-L' follows redirects.
# - '-o' specifies the output filename.
curl -Lo "$DOWNLOAD_PATH" "$DOWNLOAD_URL"

echo ""
echo "Download complete. Extracting files into '$TARGET_DIR'..."

# Unzip the downloaded archive into the target directory.
# - '-o' overwrites files without prompting if they already exist.
# - '-d' specifies the destination directory for extraction.
unzip -o "$DOWNLOAD_PATH" -d "$TARGET_DIR"

echo ""
echo "Cleaning up downloaded archive..."
# Remove the downloaded .zip file.
rm "$DOWNLOAD_PATH"

echo ""
echo "Successfully downloaded and extracted the latest version of statedb into the '$TARGET_DIR' directory!"
