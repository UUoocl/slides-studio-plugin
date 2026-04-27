import ctypes
import os
import sys

lib_path = "/Users/jonwood/Github_local_dev/slidesstudio/slidesStudio-vault/.obsidian/plugins/slides-studio/pythonScripts/uvc-util/libuvcutil.dylib"
print(f"Checking path: {lib_path}")
print(f"Exists: {os.path.exists(lib_path)}")

try:
    lib = ctypes.CDLL(lib_path)
    print("Successfully loaded!")
except Exception as e:
    print(f"Failed: {e}")
    sys.exit(1)
