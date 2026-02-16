import sys
import json
import socket
import time
import threading
from pynput import mouse

# Configuration
# Usage: python mouse_monitor.py <host:port> <pos:0|1> <clicks:0|1> <scroll:0|1>
target = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1:57001"
try:
    host, port = target.split(':')
    port = int(port)
except ValueError:
    host = "127.0.0.1"
    port = 57001

monitor_pos = sys.argv[2] == '1' if len(sys.argv) > 2 else True
monitor_clicks = sys.argv[3] == '1' if len(sys.argv) > 3 else True
monitor_scroll = sys.argv[4] == '1' if len(sys.argv) > 4 else True

event_lock = threading.Lock()

# State
pending_move = None
pending_clicks = []
scroll_state = {"x": 0, "y": 0, "dx": 0.0, "dy": 0.0}

def on_move(x, y):
    if not monitor_pos: return
    global pending_move
    with event_lock:
        pending_move = {"x": int(x), "y": int(y)}

def on_click(x, y, button, pressed):
    if not monitor_clicks: return
    if pressed:
        btn_code = ""
        if button == mouse.Button.left:
            btn_code = "MB1"
        elif button == mouse.Button.right:
            btn_code = "MB2"
        elif button == mouse.Button.middle:
            btn_code = "MB3"
        
        if btn_code:
            with event_lock:
                pending_clicks.append({
                    "button": btn_code,
                    "x": int(x),
                    "y": int(y),
                    "pressed": pressed
                })

def on_scroll(x, y, dx, dy):
    if not monitor_scroll: return
    with event_lock:
        scroll_state["x"] = int(x)
        scroll_state["y"] = int(y)
        scroll_state["dx"] += dx
        scroll_state["dy"] += dy

def send_to_socket(sock, topic, data):
    try:
        payload = json.dumps({"topic": topic, "data": data}) + "\n"
        sock.sendall(payload.encode('utf-8'))
    except Exception as e:
        # Silently fail if server is not reachable
        pass

def timer_loop():
    global pending_move
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    connected = False
    while not connected:
        try:
            sock.connect((host, port))
            connected = True
        except Exception as e:
            time.sleep(1) # Wait for server to be ready
            
    while True:
        time.sleep(0.05) # 20Hz update rate
        
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
                # Decay
                scroll_state["dx"] *= 0.8
                scroll_state["dy"] *= 0.8
                if abs(scroll_state["dx"]) < 0.5: scroll_state["dx"] = 0.0
                if abs(scroll_state["dy"]) < 0.5: scroll_state["dy"] = 0.0

        if move_to_send:
            send_to_socket(sock, "mousePosition", move_to_send)
        
        for click in clicks_to_send:
            send_to_socket(sock, "mouseClick", click)
            
        if scroll_to_send:
            send_to_socket(sock, "mouseScroll", scroll_to_send)

if __name__ == "__main__":
    print(f"Starting Mouse Monitor targeting socket {host}:{port}...")
    
    # Start the processing timer
    timer_thread = threading.Thread(target=timer_loop, daemon=True)
    timer_thread.start()

    # Start the mouse listener
    try:
        with mouse.Listener(on_move=on_move, on_click=on_click, on_scroll=on_scroll) as listener:
            listener.join()
    except KeyboardInterrupt:
        print("Stopping Mouse Monitor...")
