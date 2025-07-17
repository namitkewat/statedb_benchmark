# parser.py

import ctypes
import os
import platform
import json

# --- 1. Define the C-compatible struct in Python ---
# This class MUST exactly match the `ParseResult` extern struct in your Zig code.
class ParseResult(ctypes.Structure):
    _fields_ = [
        ("success", ctypes.c_bool),
        # A C-style string pointer (char*).
        ("err", ctypes.c_char_p),
        # Another C-style string pointer.
        ("json_result", ctypes.c_char_p),
    ]

# --- 2. Locate and load the correct shared library from the 'release' folder ---
def get_library_path():
    """Determines the correct path to the shared library based on the OS and architecture."""
    system = platform.system()
    machine = platform.machine().lower()

    # Normalize architecture names
    if machine in ["amd64", "x86_64"]:
        arch = "x86_64"
    elif machine in ["arm64", "aarch64"]:
        arch = "aarch64"
    else:
        raise OSError(f"Unsupported architecture: {machine}")

    # Determine OS name and library extension
    if system == 'Windows':
        os_name = "windows"
        lib_name = "bin/statedb_parser.dll" # .dll is in the bin subfolder
    elif system == 'Darwin':
        os_name = "macos"
        lib_name = "lib/libstatedb_parser.dylib"
    elif system == 'Linux':
        os_name = "linux"
        lib_name = "lib/libstatedb_parser.so"
    else:
        raise OSError(f"Unsupported operating system: {system}")

    # Construct the path based on the release build structure
    # e.g., ./release/statedb-x86_64-linux/lib/libstatedb_parser.so
    release_dir = f"statedb-{arch}-{os_name}"
    full_path = os.path.join("release", release_dir, lib_name)
    
    # Using an absolute path is more robust for the dynamic linker.
    return os.path.abspath(full_path)


lib_path = get_library_path()
print(f"Attempting to load library from: {lib_path}")

if not os.path.exists(lib_path):
    print(f"Error: Library file not found at '{lib_path}'")
    print("Please run the release build script first (e.g., build-all.sh or build-all.ps1)")
    exit(1)

try:
    # Load the shared library into memory.
    # Because we statically linked libc, we no longer need special flags for Linux.
    zig_lib = ctypes.CDLL(lib_path)
except OSError as e:
    print(f"Error loading library: {e}")
    exit(1)


# --- 3. Define function prototypes (Argument and Return Types) ---
# This tells ctypes how to correctly call the functions and interpret their values.

# Corresponds to: export fn parse_command(input: [*:0]const u8) *ParseResult
parse_command_func = zig_lib.parse_command
parse_command_func.argtypes = [ctypes.c_char_p]
parse_command_func.restype = ctypes.POINTER(ParseResult)

# Corresponds to: export fn free_parse_result(result: *ParseResult) void
free_parse_result_func = zig_lib.free_parse_result
free_parse_result_func.argtypes = [ctypes.POINTER(ParseResult)]
free_parse_result_func.restype = None # The function returns void.


# --- 4. Main execution logic ---
def main():
    print('\n--- Testing StateDB Parser FFI with Python ctypes ---')

    resp_command = b"*3\r\n$3\r\nSET\r\n$5\r\nmykey\r\n$7\r\nmyvalue\r\n"
    result_ptr = None

    try:
        # Call the Zig function. It returns a pointer to the ParseResult struct.
        print(f"\nSending command to Zig: {resp_command!r}")
        result_ptr = parse_command_func(resp_command)

        if not result_ptr:
            raise Exception("Zig function returned a null pointer.")

        # Access the data by getting the `contents` of the pointer.
        result_struct = result_ptr.contents

        print('\nReceived result from Zig:')
        print(f"  Success: {result_struct.success}")

        if result_struct.success:
            # Decode the C string pointer to a Python string.
            json_string = result_struct.json_result.decode('utf-8')
            print(f"  JSON Result: {json_string}")
            
            # You can now parse and use the JSON.
            parsed_json = json.loads(json_string)
            print('  Parsed JSON Object:', parsed_json)
        else:
            # Decode the error message.
            error_string = result_struct.err.decode('utf-8')
            print(f"  Error: {error_string}")

    except Exception as e:
        print(f'An error occurred during FFI call: {e}')
    finally:
        # --- 5. CRITICAL: Free the memory ---
        # If the pointer is not null, we MUST call the Zig `free` function
        # to prevent a memory leak in the Zig part of the application.
        if result_ptr:
            print('\nCalling Zig to free the allocated memory...')
            free_parse_result_func(result_ptr)
            print('Memory freed.')

if __name__ == "__main__":
    main()
