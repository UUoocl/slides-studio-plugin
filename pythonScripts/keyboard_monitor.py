import sys
import json
import time
import threading
import logging
from pynput import keyboard
from socketclusterclient import Socketcluster

# Configure logging to stdout
logging.basicConfig(
    format='%(levelname)s:%(message)s', 
    level=logging.DEBUG,
    stream=sys.stdout
)

# Configuration
target_url = sys.argv[1] if len(sys.argv) > 1 else "ws://127.0.0.1:8000/socketcluster/"

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

# SocketCluster state
sc = None
connected = False

def heartbeat_loop():
    while True:
        time.sleep(20)
        if connected and sc:
            try:
                logging.debug("Sending heartbeat...")
                # Use emit instead of publish for heartbeat to avoid re-broadcasting
                sc.emit("heartbeat", {"name": "Python-Keyboard-Monitor"})
            except Exception as e:
                logging.error(f"Heartbeat failed: {e}")

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

def on_connect(socket):
    global connected
    connected = True
    logging.info(f"CONNECTED to SocketCluster: {target_url}")
    # Identify this client
    socket.emit("setInfo", {"name": "Python-Keyboard-Monitor"})
    # Test publish
    socket.publish("keyboardSettings", {"status": "connected", "test": True})

def on_disconnect(socket):
    global connected
    connected = False
    logging.warning("DISCONNECTED from SocketCluster")

def on_connect_error(socket, error):
    logging.error(f"CONNECTION ERROR: {error}")

def on_press(key):
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
        try:
            sc.publish("keyboardPress", data)
        except Exception as e:
            logging.error(f"Failed to publish: {e}")
    else:
        logging.warning(f"Not connected, cannot publish: {combo}")

def on_release(key):
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
        try:
            sc.publish("keyboardRelease", data)
        except Exception as e:
            logging.error(f"Failed to publish: {e}")
    else:
        logging.warning(f"Not connected, cannot publish: {combo}")

if __name__ == "__main__":
    logging.info(f"Starting Keyboard Monitor targeting {target_url}...")
    sc = Socketcluster.socket(target_url)
    sc.setBasicListener(on_connect, on_disconnect, on_connect_error)
    sc.setreconnection(True)
    
    # Run connect in a thread to avoid blocking if the library behaves synchronously
    connect_thread = threading.Thread(target=sc.connect, daemon=True)
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

