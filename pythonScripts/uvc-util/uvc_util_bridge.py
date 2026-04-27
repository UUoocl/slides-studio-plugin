import json
import os
import threading
import ctypes
import sys
import argparse
import time
import websocket

# Global variables
lib_path = os.path.join(os.path.dirname(__file__), "libuvcutil.dylib")
uvc_lib = None
ws = None
connected = False
configs = {} # name -> {index, polling, pps, last_poll, mapEnabled, mapMin, mapMax}
lock = threading.Lock()

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
        # Use json.dumps for dicts/lists to ensure double quotes for the C library
        if (isinstance(value, (dict, list))):
            val_str = json.dumps(value, separators=(',', ':'))
        else:
            val_str = str(value)
            
        res_ptr = self.lib.uvclib_set_value(control.encode('utf-8'), val_str.encode('utf-8'))
        if res_ptr:
            return json.loads(res_ptr.decode('utf-8'))
        return None

def lerp(val, in_min, in_max, out_min, out_max):
    if in_max == in_min:
        return out_min
    res = (val - in_min) * (out_max - out_min) / (in_max - in_min) + out_min
    return round(float(res), 4)

def apply_mapping(control_data, config):
    if not config.get('mapEnabled'):
        return control_data
        
    out_min = config.get('mapMin', 0)
    out_max = config.get('mapMax', 1)
    
    if isinstance(control_data, list):
        for ctrl in control_data:
            _map_single_control(ctrl, out_min, out_max)
    else:
        _map_single_control(control_data, out_min, out_max)
        
    return control_data

def _map_single_control(ctrl, out_min, out_max):
    if 'current-value' not in ctrl or 'minimum' not in ctrl or 'maximum' not in ctrl:
        return
        
    val = ctrl['current-value']
    c_min = ctrl['minimum']
    c_max = ctrl['maximum']
    
    if isinstance(val, dict) and isinstance(c_min, dict) and isinstance(c_max, dict):
        # Compound value (eg pan-tilt)
        mapped = {}
        for key in val:
            if key in c_min and key in c_max:
                mapped[key] = lerp(val[key], c_min[key], c_max[key], out_min, out_max)
        ctrl['mapped-value'] = mapped
    elif isinstance(val, (int, float)):
        # Scalar value
        ctrl['mapped-value'] = lerp(val, c_min, c_max, out_min, out_max)
        
def send_message(msg_type, **kwargs):
    """Sends a message via WebSocket in the new protocol format."""
    global ws, connected
    if not connected or not ws:
        return
    try:
        msg = {"type": msg_type}
        msg.update(kwargs)
        ws.send(json.dumps(msg))
    except Exception as e:
        print(f"Failed to send message: {e}")

def send_to_sc(channel, data):
    send_message("publish", channel=channel, data=data)

def process_command(payload, device_index=None, config=None):
    global uvc_lib, lock
    if not uvc_lib or not uvc_lib.is_loaded():
        return {"error": "UVC library not loaded"}
        
    action = payload.get("action")
    
    with lock:
        # If device_index is provided, select it before processing
        if device_index is not None:
            uvc_lib.select_device(device_index)
            
        if action == "list_devices":
            uvc_lib.lib.uvclib_refresh_devices()
            return {"action": "list_devices", "data": uvc_lib.get_devices()}
            
        elif action == "get_controls":
            controls = uvc_lib.get_controls()
            if config:
                controls = apply_mapping(controls, config)
            return {"action": "get_controls", "data": controls}
            
        elif action == "get_value":
            control = payload.get("control")
            if control:
                val = uvc_lib.get_value(control)
                if config:
                    controls = uvc_lib.get_controls()
                    ctrl_meta = next((c for c in controls if c['name'] == control), None)
                    if ctrl_meta:
                        ctrl_meta['current-value'] = val
                        apply_mapping([ctrl_meta], config)
                        return {"action": "get_value", "control": control, "data": val, "mapped-value": ctrl_meta.get('mapped-value')}
                return {"action": "get_value", "control": control, "data": val}
            return {"error": "Missing control name"}
            
        elif action == "set_value":
            control = payload.get("control")
            value = payload.get("value")
            if control and value is not None:
                # Try to parse string values as JSON if they look like objects
                if isinstance(value, str) and value.strip().startswith('{'):
                    try:
                        value = json.loads(value)
                    except Exception as e:
                        print(f"[UVC Bridge] JSON parse error for value: {e}")
                
                res = uvc_lib.set_value(control, value)
                return {"action": "set_value", "control": control, "data": res}
            return {"error": "Missing control name or value"}
            
    return {"error": "Unknown action"}

def handle_message(ws_instance, message):
    try:
        data = json.loads(message)
        if data.get("type") == "event":
            channel = data.get("channel")
            payload = data.get("data")
            if channel == "uvcCommands":
                on_uvc_command(channel, payload)
            elif channel.startswith("uvc_out_"):
                on_uvc_out(channel, payload)
    except Exception as e:
        print(f"Error handling message: {e}")

def on_uvc_out(channel, data):
    name = channel.replace("uvc_out_", "")
    config = configs.get(name)
    if not config:
        return
        
    try:
        response = process_command(data, device_index=config['index'], config=config)
        if response:
            send_to_sc(f"uvc_in_{name}", response)
    except Exception as e:
        send_to_sc(f"uvc_in_{name}", {"error": str(e)})

def on_uvc_command(channel, data):
    action = data.get("action")
    if action == "configure":
        update_configs(data.get("devices", []))
    else:
        try:
            response = process_command(data)
            if response:
                send_message("call", id="uvcResp-"+str(time.time()), method="uvcResponse", data=response)
        except Exception as e:
            send_message("call", id="uvcResp-"+str(time.time()), method="uvcResponse", data={"error": str(e)})

def update_configs(device_list):
    global configs
    new_configs = {}
    for d in device_list:
        name = d['name']
        new_configs[name] = {
            'index': d['index'],
            'polling': d.get('pollingEnabled', False),
            'pps': d.get('pollsPerSecond', 1),
            'last_poll': 0,
            'mapEnabled': d.get('mapEnabled', False),
            'mapMin': d.get('mapMin', 0),
            'mapMax': d.get('mapMax', 1)
        }
        # Subscribe to out channel if new
        if name not in configs:
            chan = f"uvc_out_{name}"
            send_message("subscribe", channel=chan)
            print(f"Subscribed to {chan}")
            
    configs = new_configs

def polling_loop():
    while True:
        if not connected:
            time.sleep(1)
            continue
            
        now = time.time()
        items = list(configs.items())
        for name, config in items:
            if config['polling']:
                interval = 1.0 / max(0.1, config['pps'])
                if now - config['last_poll'] >= interval:
                    config['last_poll'] = now
                    try:
                        res = process_command({"action": "get_controls"}, device_index=config['index'], config=config)
                        if res and "data" in res:
                            # print(f"Polling {name}: found {len(res['data'])} controls")
                            send_to_sc(f"uvc_in_{name}", {"action": "poll", "data": res['data']})
                        else:
                            print(f"Polling {name} failed: process_command returned {res}")
                    except Exception as e:
                        print(f"Polling loop error for {name}: {e}")
        time.sleep(0.01)

def on_open(ws_instance):
    global connected, ws
    connected = True
    ws = ws_instance
    print("Connected to WebSocket")
    # Identify this client
    send_message("call", id="init", method="setInfo", data={"name": "Python-UVC-Bridge"})
    send_message("call", id="uvcInit", method="uvcResponse", data={"status": "connected", "lib_loaded": uvc_lib.is_loaded()})
    
    # Subscribe to general commands
    send_message("subscribe", channel="uvcCommands")

def on_close(ws_instance, close_status_code, close_msg):
    global connected
    connected = False
    print(f"Disconnected from WebSocket: {close_msg}")

def on_error(ws_instance, error):
    print(f"Connection Error: {error}")

def main():
    global uvc_lib, lib_path
    
    parser = argparse.ArgumentParser(description="UVC Utility WebSocket Bridge")
    parser.add_argument("--url", type=str, default="ws://127.0.0.1:57000/websocket/", help="WebSocket URL")
    parser.add_argument("--lib", type=str, default=lib_path, help="Path to libuvcutil.dylib")
    args = parser.parse_args()
    
    lib_path = args.lib
    target_url = args.url
    
    print(f"Initializing UVC Bridge, connecting to {target_url}...")
    uvc_lib = UVCLib(lib_path)
    
    # Start polling thread
    pt = threading.Thread(target=polling_loop, daemon=True)
    pt.start()
    
    ws_app = websocket.WebSocketApp(target_url,
                              on_open=on_open,
                              on_message=handle_message,
                              on_error=on_error,
                              on_close=on_close)
    
    ws_app.run_forever()

if __name__ == "__main__":
    main()
