import sys
import json
import time
import threading
import logging
from pynput import keyboard
import websocket

# Configure logging to stdout
logging.basicConfig(
    format='%(levelname)s:%(message)s', 
    level=logging.DEBUG,
    stream=sys.stdout
)

# Configuration
target_url = sys.argv[1] if len(sys.argv) > 1 else "ws://127.0.0.1:57000/websocket/"

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

# WebSocket state
ws = None
connected = False

def send_message(msg_type, **kwargs):
    """Sends a message via WebSocket in the new protocol format."""
    if not connected or not ws:
        return
    try:
        msg = {"type": msg_type}
        msg.update(kwargs)
        ws.send(json.dumps(msg))
    except Exception as e:
        logging.error(f"Failed to send message: {e}")

def heartbeat_loop():
    """Sends periodic heartbeats to the server."""
    while True:
        time.sleep(20)
        if connected:
            send_message("call", id="hb-"+str(time.time()), method="heartbeat", data={"name": "Python-Keyboard-Monitor"})

def get_modifier_string():
    """Returns a string representation of currently active modifiers."""
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

def on_open(ws_instance):
    """Callback for successful WebSocket connection."""
    global connected, ws
    connected = True
    ws = ws_instance
    logging.info(f"CONNECTED to WebSocket: {target_url}")
    # Identify this client
    send_message("call", id="init", method="setInfo", data={"name": "Python-Keyboard-Monitor"})
    # Test publish
    send_message("publish", channel="keyboardSettings", data={"status": "connected", "test": True})

def on_close(ws_instance, close_status_code, close_msg):
    """Callback for WebSocket disconnection."""
    global connected
    connected = False
    logging.warning(f"DISCONNECTED from WebSocket: {close_msg}")

def on_error(ws_instance, error):
    """Callback for WebSocket errors."""
    logging.error(f"CONNECTION ERROR: {error}")

def on_press(key):
    """Callback for keyboard press events."""
    logging.debug(f"Key pressed: {key}")
    if key in modifiers:
        modifiers[key] = True
        return

    try:
        k = key.char
        if k is None: k = str(key)
    except AttributeError:
        k = str(key)
    
    mod_prefix = get_modifier_string()
    combo = f"{mod_prefix} + {k}" if mod_prefix else k
    
    data = {
        "combo": combo,
        "key": k,
        "modifiers": mod_prefix,
        "event": "press"
    }
    
    if connected:
        logging.debug(f"Publishing keyboardPress: {combo}")
        send_message("publish", channel="keyboardPress", data=data)
    else:
        logging.warning(f"Not connected, cannot publish: {combo}")

def on_release(key):
    """Callback for keyboard release events."""
    logging.debug(f"Key released: {key}")
    if key in modifiers:
        modifiers[key] = False
        return

    try:
        k = key.char
        if k is None: k = str(key)
    except AttributeError:
        k = str(key)
        
    mod_prefix = get_modifier_string()
    combo = f"{mod_prefix} + {k}" if mod_prefix else k
        
    data = {
        "combo": combo,
        "key": k,
        "modifiers": mod_prefix,
        "event": "release"
    }
    
    if connected:
        logging.debug(f"Publishing keyboardRelease: {combo}")
        send_message("publish", channel="keyboardRelease", data=data)
    else:
        logging.warning(f"Not connected, cannot publish: {combo}")

def main():
    """Main entry point for the Keyboard Monitor."""
    logging.info(f"Starting Keyboard Monitor targeting {target_url}...")
    
    ws_app = websocket.WebSocketApp(target_url,
                              on_open=on_open,
                              on_error=on_error,
                              on_close=on_close)
    
    connect_thread = threading.Thread(target=ws_app.run_forever, daemon=True)
    connect_thread.start()

    # Start heartbeat thread
    hb_thread = threading.Thread(target=heartbeat_loop, daemon=True)
    hb_thread.start()

    logging.info("Starting keyboard listener...")
    try:
        with keyboard.Listener(on_press=on_press, on_release=on_release) as listener:
            logging.info("Keyboard listener joined.")
            listener.join()
    except Exception as e:
        logging.error(f"Keyboard listener error: {e}")
    except KeyboardInterrupt:
        logging.info("Stopping Keyboard Monitor...")

if __name__ == "__main__":
    main()
