import json
import os
import threading
import ctypes
import socketserver
import base64
import hashlib
import struct
import sys
import argparse

# Global variables
lib_path = os.path.join(os.path.dirname(__file__), "libuvcutil.dylib")
server_port = 8081
uvc_lib = None

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

# --- WebSocket Server ---

class WebSocketHandler(socketserver.StreamRequestHandler):
    def handle(self):
        print(f"New connection from {self.client_address}")
        if not self.handshake():
            print("Handshake failed.")
            return
        
        print("Handshake successful.")
        while True:
            try:
                data = self.read_frame()
                if data is None: 
                    print("Connection closed by client.")
                    break 
                
                # Process Command
                try:
                    payload = json.loads(data)
                    response = self.process_command(payload)
                    if response:
                        self.send_frame(json.dumps(response))
                except json.JSONDecodeError:
                    self.send_frame(json.dumps({"error": "Invalid JSON"}))
                except Exception as e:
                    print(f"Command processing error: {e}")
                    self.send_frame(json.dumps({"error": str(e)}))
                    
            except Exception as e:
                print(f"WebSocket read error: {e}")
                break

    def handshake(self):
        headers = {}
        while True:
            line = self.rfile.readline().decode('utf-8').strip()
            if not line: break
            if ':' in line:
                key, value = line.split(':', 1)
                headers[key.strip().lower()] = value.strip()
        
        if 'sec-websocket-key' not in headers:
            return False
            
        key = headers['sec-websocket-key']
        accept_key = base64.b64encode(hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode('utf-8')).digest()).decode('utf-8')
        
        response = (
            "HTTP/1.1 101 Switching Protocols\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Accept: {accept_key}\r\n\r\n"
        )
        self.wfile.write(response.encode('utf-8'))
        self.wfile.flush()
        return True

    def read_frame(self):
        try:
            head1 = self.rfile.read(1)
            if not head1: return None
            b1 = head1[0]
            opcode = b1 & 0x0F
            
            if opcode == 8: return None # Close frame
            
            head2 = self.rfile.read(1)
            if not head2: return None
            b2 = head2[0]
            masked = b2 & 0x80
            length = b2 & 0x7F
            
            if length == 126:
                length = struct.unpack(">H", self.rfile.read(2))[0]
            elif length == 127:
                length = struct.unpack(">Q", self.rfile.read(8))[0]
                
            masks = None
            if masked:
                masks = self.rfile.read(4)
                
            payload = self.rfile.read(length)
            
            if masked:
                decoded = bytearray(length)
                for i in range(length):
                    decoded[i] = payload[i] ^ masks[i % 4]
                return decoded.decode('utf-8')
            
            return payload.decode('utf-8')
        except Exception as e:
            print(f"Error reading frame: {e}")
            return None

    def send_frame(self, message):
        try:
            encoded = message.encode('utf-8')
            length = len(encoded)
            
            header = bytearray()
            header.append(0x81) # Text frame, FIN
            
            if length <= 125:
                header.append(length)
            elif length <= 65535:
                header.append(126)
                header.extend(struct.pack(">H", length))
            else:
                header.append(127)
                header.extend(struct.pack(">Q", length))
                
            self.wfile.write(header + encoded)
            self.wfile.flush()
        except Exception as e:
            print(f"Error sending frame: {e}")

    def process_command(self, payload):
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

class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True

def main():
    global uvc_lib, server_port, lib_path
    
    parser = argparse.ArgumentParser(description="UVC Utility WebSocket Bridge")
    parser.add_argument("--port", type=int, default=8081, help="WebSocket port (default: 8081)")
    parser.add_argument("--lib", type=str, default=lib_path, help="Path to libuvcutil.dylib")
    args = parser.parse_args()
    
    server_port = args.port
    lib_path = args.lib
    
    print(f"Initializing UVC Bridge on port {server_port}...")
    uvc_lib = UVCLib(lib_path)
    
    # We allow the server to start even if the lib is not loaded, 
    # so we can report errors via WebSocket if a client connects.
        
    try:
        server = ThreadedTCPServer(('127.0.0.1', server_port), WebSocketHandler)
        print(f"UVC WebSocket server started on ws://127.0.0.1:{server_port}")
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
    except Exception as e:
        print(f"Failed to start WebSocket server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
