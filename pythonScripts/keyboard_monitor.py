import sys
import json
import socket
import time
import threading
from pynput import keyboard

# Configuration
# Usage: python keyboard_monitor.py <host:port> <show_combo:0|1>
target = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1:57001"
try:
    host, port = target.split(':')
    port = int(port)
except ValueError:
    host = "127.0.0.1"
    port = 57001

show_combinations = sys.argv[2] == '1' if len(sys.argv) > 2 else True

# Modifier tracking
modifiers = {
    keyboard.Key.ctrl: False,
    keyboard.Key.ctrl_l: False,
    keyboard.Key.ctrl_r: False,
    keyboard.Key.alt: False,
    keyboard.Key.alt_l: False,
    keyboard.Key.alt_r: False,
    keyboard.Key.shift: False,
    keyboard.Key.shift_l: False,
    keyboard.Key.shift_r: False,
    keyboard.Key.cmd: False,
    keyboard.Key.cmd_l: False,
    keyboard.Key.cmd_r: False,
}

# Socket state
sock_lock = threading.Lock()
sock = None

def get_modifier_string():
    parts = []
    if modifiers[keyboard.Key.ctrl] or modifiers[keyboard.Key.ctrl_l] or modifiers[keyboard.Key.ctrl_r]:
        parts.append("ctrl")
    if modifiers[keyboard.Key.alt] or modifiers[keyboard.Key.alt_l] or modifiers[keyboard.Key.alt_r]:
        parts.append("alt")
    if modifiers[keyboard.Key.shift] or modifiers[keyboard.Key.shift_l] or modifiers[keyboard.Key.shift_r]:
        parts.append("shift")
    if modifiers[keyboard.Key.cmd] or modifiers[keyboard.Key.cmd_l] or modifiers[keyboard.Key.cmd_r]:
        parts.append("cmd")
    return " + ".join(parts)

def send_to_socket(topic, data):
    global sock
    with sock_lock:
        if sock:
            try:
                payload = json.dumps({"topic": topic, "data": data}) + "\n"
                sock.sendall(payload.encode('utf-8'))
            except Exception:
                sock = None # Trigger reconnection

def on_press(key):
    if key in modifiers:
        modifiers[key] = True
        return

    try:
        k = key.char  # single-char keys
        if k is None:
            k = str(key)
    except AttributeError:
        k = str(key)  # other keys
    
    mod_prefix = get_modifier_string()
    combo = f"{mod_prefix} + {k}" if mod_prefix else k
    
    send_to_socket("keyboardPress", {
        "combo": combo,
        "key": k,
        "modifiers": mod_prefix,
        "event": "press"
    })

def on_release(key):
    if key in modifiers:
        modifiers[key] = False
        return

    try:
        k = key.char
        if k is None:
            k = str(key)
    except AttributeError:
        k = str(key)
        
    mod_prefix = get_modifier_string()
    combo = f"{mod_prefix} + {k}" if mod_prefix else k
        
    send_to_socket("keyboardRelease", {
        "combo": combo,
        "key": k,
        "modifiers": mod_prefix,
        "event": "release"
    })

def connection_manager():
    global sock
    while True:
        with sock_lock:
            if sock is None:
                try:
                    new_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    new_sock.connect((host, port))
                    sock = new_sock
                    print(f"Connected to {host}:{port}")
                except Exception:
                    pass
        time.sleep(1)

if __name__ == "__main__":
    print(f"Starting Keyboard Monitor targeting socket {host}:{port}...")
    
    # Start the connection manager
    threading.Thread(target=connection_manager, daemon=True).start()

    # Start the keyboard listener
    try:
        with keyboard.Listener(on_press=on_press, on_release=on_release) as listener:
            listener.join()
    except KeyboardInterrupt:
        print("Stopping Keyboard Monitor...")
