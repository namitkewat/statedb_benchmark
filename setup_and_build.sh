#!/bin/bash
#
# setup_and_build.sh
#
# This script automates the process of setting up the StateDB development
# environment. It clones the repository from GitHub, initializes its
# dependencies, and then runs the cross-platform build script.
#
# It requires `git` and `zig` to be installed and available in the PATH.

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
REPO_URL="https://github.com/namitkewat/statedb.git"
CLONE_DIR="statedb"

# --- Script ---

echo "Checking for required tools (git, zig)..."
for tool in git zig; do
  if ! command -v $tool &> /dev/null; then
    echo "Error: $tool is not installed. Please install it to continue."
    exit 1
  fi
done
echo "All required tools are present."
echo ""

# --- 1. Clean and Clone Repository ---
echo "Preparing clone directory: $CLONE_DIR..."
# Remove the directory if it exists to ensure a completely fresh clone.
if [ -d "$CLONE_DIR" ]; then
    echo "Removing existing '$CLONE_DIR' directory..."
    rm -rf "$CLONE_DIR"
fi

echo "Cloning repository from $REPO_URL..."
git clone "$REPO_URL" "$CLONE_DIR"
echo "Clone complete."
echo ""

# --- 2. Navigate into the repo and set up dependencies ---
# All subsequent commands run from within the project directory.
cd "$CLONE_DIR"

echo "Initializing Git submodules (for zig-clap)..."
git submodule update --init --recursive
echo "Submodules initialized."
echo ""

# --- 3. Run the cross-platform build script ---
# First, ensure the build script is executable.
if [ ! -f "build-all.sh" ]; then
    echo "Error: build-all.sh not found in the repository."
    exit 1
fi

echo "Making build script executable..."
chmod +x build-all.sh

echo "Running the multi-platform build..."
./build-all.sh

echo ""
echo "------------------------------------------------"
echo "StateDB setup and build process completed successfully!"
echo "Release artifacts are located in the './release' directory."
echo "------------------------------------------------"
