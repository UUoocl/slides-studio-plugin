import sys
import json
import time
import threading
import logging
from pynput import mouse
import websocket

# Configure logging to stdout
logging.basicConfig(
    format='%(levelname)s:%(message)s', 
    level=logging.DEBUG,
    stream=sys.stdout
)

# Configuration
target_url = sys.argv[1] if len(sys.argv) > 1 else "ws://127.0.0.1:57000/websocket/"
monitor_pos = sys.argv[2] == '1' if len(sys.argv) > 2 else True
monitor_clicks = sys.argv[3] == '1' if len(sys.argv) > 3 else True
monitor_scroll = sys.argv[4] == '1' if len(sys.argv) > 4 else True
target_pps = int(sys.argv[5]) if len(sys.argv) > 5 else 20
update_interval = 1.0 / target_pps

event_lock = threading.Lock()

# State
pending_move = None
pending_clicks = []
scroll_state = {"x": 0, "y": 0, "dx": 0.0, "dy": 0.0}
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
            send_message("call", id="hb-"+str(time.time()), method="heartbeat", data={"name": "Python-Mouse-Monitor"})

def on_open(ws_instance):
    """Callback for successful WebSocket connection."""
    global connected, ws
    connected = True
    ws = ws_instance
    logging.info(f"CONNECTED to WebSocket: {target_url}")
    # Identify this client
    send_message("call", id="init", method="setInfo", data={"name": "Python-Mouse-Monitor"})
    # Test publish
    send_message("publish", channel="mousePosition", data={"x": 0, "y": 0, "test": True})

def on_close(ws_instance, close_status_code, close_msg):
    """Callback for WebSocket disconnection."""
    global connected
    connected = False
    logging.warning(f"DISCONNECTED from WebSocket: {close_msg}")

def on_error(ws_instance, error):
    """Callback for WebSocket errors."""
    logging.error(f"CONNECTION ERROR: {error}")

def on_move(x, y):
    """Callback for mouse move events."""
    if not monitor_pos: return
    global pending_move
    with event_lock:
        pending_move = {"x": int(x), "y": int(y)}

def on_click(x, y, button, pressed):
    """Callback for mouse click events."""
    if not monitor_clicks: return
    btn_code = ""
    if button == mouse.Button.left: btn_code = "MB1"
    elif button == mouse.Button.right: btn_code = "MB2"
    elif button == mouse.Button.middle: btn_code = "MB3"
    
    if btn_code:
        with event_lock:
            pending_clicks.append({
                "button": btn_code,
                "x": int(x),
                "y": int(y),
                "pressed": pressed
            })

def on_scroll(x, y, dx, dy):
    """Callback for mouse scroll events."""
    if not monitor_scroll: return
    with event_lock:
        scroll_state["x"] = int(x)
        scroll_state["y"] = int(y)
        scroll_state["dx"] += dx
        scroll_state["dy"] += dy

def timer_loop():
    """Periodically publishes accumulated mouse events."""
    global pending_move
    while True:
        time.sleep(update_interval)
        if not connected: continue
        
        move_to_send = None
        clicks_to_send = []
        scroll_to_send = None

        with event_lock:
            if pending_move:
                move_to_send = pending_move
                pending_move = None
            if pending_clicks:
                clicks_to_send = pending_clicks[:]
                pending_clicks.clear()
            if abs(scroll_state["dx"]) > 0.1 or abs(scroll_state["dy"]) > 0.1:
                scroll_to_send = {
                    "x": scroll_state["x"],
                    "y": scroll_state["y"],
                    "dx": int(scroll_state["dx"]),
                    "dy": int(scroll_state["dy"])
                }
                scroll_state["dx"] *= 0.8
                scroll_state["dy"] *= 0.8

        if move_to_send:
            send_message("publish", channel="mousePosition", data=move_to_send)
        for click in clicks_to_send:
            send_message("publish", channel="mouseClick", data=click)
        if scroll_to_send:
            send_message("publish", channel="mouseScroll", data=scroll_to_send)

def main():
    """Main entry point for the Mouse Monitor."""
    logging.info(f"Starting Mouse Monitor targeting {target_url}...")
    
    # Use websocket-client for simple synchronous operation in a thread
    ws_app = websocket.WebSocketApp(target_url,
                              on_open=on_open,
                              on_error=on_error,
                              on_close=on_close)
    
    connect_thread = threading.Thread(target=ws_app.run_forever, daemon=True)
    connect_thread.start()

    timer_thread = threading.Thread(target=timer_loop, daemon=True)
    timer_thread.start()

    # Start heartbeat thread
    hb_thread = threading.Thread(target=heartbeat_loop, daemon=True)
    hb_thread.start()

    logging.info("Starting mouse listener...")
    try:
        with mouse.Listener(on_move=on_move, on_click=on_click, on_scroll=on_scroll) as listener:
            logging.info("Mouse listener joined.")
            listener.join()
    except Exception as e:
        logging.error(f"Mouse listener error: {e}")
    except KeyboardInterrupt:
        logging.info("Stopping Mouse Monitor...")

if __name__ == "__main__":
    main()
