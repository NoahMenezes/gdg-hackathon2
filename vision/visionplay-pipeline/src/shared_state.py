# Global state for pipeline control
stop_requested = False

def request_stop():
    global stop_requested
    stop_requested = True

def reset_stop():
    global stop_requested
    stop_requested = False

def is_stopped():
    return stop_requested
