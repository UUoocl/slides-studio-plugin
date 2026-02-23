import json
import os
import threading
import ctypes
import socket
import sys
import argparse
import time

# Global variables
lib_path = os.path.join(os.path.dirname(__file__), "libuvcutil.dylib")
uvc_lib = None
monitor_socket = None

# --- UVC Library Interface ---
class UVCLib:
    def __init__(self, dylib_path):
        self.lib = None
        print(f"Attempting to load UVC library from: {dylib_path}")
        if os.path.exists(dylib_path):
            try:
                self.lib = ctypes.CDLL(dylib_path)
                
                # int uvclib_refresh_devices()
                self.lib.uvclib_refresh_devices.restype = ctypes.c_int
                
                # const char* uvclib_get_devices_json()
                self.lib.uvclib_get_devices_json.restype = ctypes.c_char_p
                
                # int uvclib_select_device(unsigned int index)
                self.lib.uvclib_select_device.argtypes = [ctypes.c_uint]
                self.lib.uvclib_select_device.restype = ctypes.c_int
                
                # const char* uvclib_get_controls_json()
                self.lib.uvclib_get_controls_json.restype = ctypes.c_char_p
                
                # const char* uvclib_get_value(const char* control_name)
                self.lib.uvclib_get_value.argtypes = [ctypes.c_char_p]
                self.lib.uvclib_get_value.restype = ctypes.c_char_p
                
                # const char* uvclib_set_value(const char* control_name, const char* value_str)
                self.lib.uvclib_set_value.argtypes = [ctypes.c_char_p, ctypes.c_char_p]
                self.lib.uvclib_set_value.restype = ctypes.c_char_p
                
                # Initial refresh
                self.lib.uvclib_refresh_devices()
                print("UVC library loaded successfully.")
                
            except Exception as e:
                print(f"Failed to load UVC library: {e}")
                self.lib = None
        else:
            print(f"UVC library file not found at: {dylib_path}")

    def is_loaded(self):
        return self.lib is not None

    def get_devices(self):
        if not self.lib: return []
        res_ptr = self.lib.uvclib_get_devices_json()
        if res_ptr:
            return json.loads(res_ptr.decode('utf-8'))
        return []

    def select_device(self, index):
        if not self.lib: return False
        return self.lib.uvclib_select_device(index) == 0

    def get_controls(self):
        if not self.lib: return []
        res_ptr = self.lib.uvclib_get_controls_json()
        if res_ptr:
            return json.loads(res_ptr.decode('utf-8'))
        return []

    def get_value(self, control):
        if not self.lib: return None
        res_ptr = self.lib.uvclib_get_value(control.encode('utf-8'))
        if res_ptr:
            return json.loads(res_ptr.decode('utf-8'))
        return None

    def set_value(self, control, value):
        if not self.lib: return None
        val_str = str(value)
        res_ptr = self.lib.uvclib_set_value(control.encode('utf-8'), val_str.encode('utf-8'))
        if res_ptr:
            return json.loads(res_ptr.decode('utf-8'))
        return None

def send_to_node(data):
    global monitor_socket
    if monitor_socket:
        try:
            payload = json.dumps({"topic": "uvc", "data": data}) + "\n"
            monitor_socket.sendall(payload.encode('utf-8'))
        except Exception as e:
            print(f"Error sending to node: {e}")

def process_command(payload):
    global uvc_lib
    if not uvc_lib or not uvc_lib.is_loaded():
        return {"error": "UVC library not loaded"}
        
    action = payload.get("action")
    
    if action == "list_devices":
        return {"action": "list_devices", "data": uvc_lib.get_devices()}
        
    elif action == "select_device":
        idx = payload.get("index")
        if idx is not None:
            success = uvc_lib.select_device(int(idx))
            return {"action": "select_device", "success": success}
        return {"error": "Missing index"}
        
    elif action == "get_controls":
        return {"action": "get_controls", "data": uvc_lib.get_controls()}
        
    elif action == "get_value":
        control = payload.get("control")
        if control:
            return {"action": "get_value", "data": uvc_lib.get_value(control)}
        return {"error": "Missing control name"}
        
    elif action == "set_value":
        control = payload.get("control")
        value = payload.get("value")
        if control and value is not None:
            return {"action": "set_value", "data": uvc_lib.set_value(control, value)}
        return {"error": "Missing control name or value"}
        
    return {"error": "Unknown action"}

def listen_for_commands():
    global monitor_socket
    buffer = ""
    while monitor_socket:
        try:
            data = monitor_socket.recv(4096).decode('utf-8')
            if not data:
                print("Connection closed by Node.")
                break
            
            buffer += data
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                if not line.strip(): continue
                try:
                    command = json.loads(line)
                    response = process_command(command)
                    if response:
                        send_to_node(response)
                except Exception as e:
                    print(f"Error processing command: {e}")
                    send_to_node({"error": str(e)})
        except Exception as e:
            print(f"Socket read error: {e}")
            break

def main():
    global uvc_lib, lib_path, monitor_socket
    
    parser = argparse.ArgumentParser(description="UVC Utility TCP Bridge")
    parser.add_argument("--port", type=str, default="57001", help="Node monitor socket (e.g. 127.0.0.1:57001 or just 57001)")
    parser.add_argument("--lib", type=str, default=lib_path, help="Path to libuvcutil.dylib")
    args = parser.parse_args()
    
    lib_path = args.lib
    target = args.port
    if ":" in target:
        host, port = target.split(":")
        port = int(port)
    else:
        host = "127.0.0.1"
        port = int(target)
    
    print(f"Initializing UVC Bridge, connecting to {host}:{port}...")
    uvc_lib = UVCLib(lib_path)
    
    # Retry connection a few times
    for _ in range(5):
        try:
            monitor_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            monitor_socket.connect((host, port))
            print(f"Connected to Node monitor socket at {host}:{port}")
            break
        except Exception as e:
            print(f"Connection failed: {e}. Retrying...")
            time.sleep(1)
    else:
        print("Could not connect to Node. Exiting.")
        sys.exit(1)

    # Send initial status
    send_to_node({"status": "connected", "lib_loaded": uvc_lib.is_loaded()})

    # Start command listener thread
    cmd_thread = threading.Thread(target=listen_for_commands, daemon=True)
    cmd_thread.start()

    try:
        while monitor_socket:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping bridge...")
    finally:
        if monitor_socket:
            monitor_socket.close()

if __name__ == "__main__":
    main()
