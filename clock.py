from flask import Flask, request, render_template
from enum import Enum
import read_segments
# from read_segments import OUT_COL_SEP, OUT_ROW_SEP, parse_segments_csv

app = Flask(__name__)

class RuntimeMode(Enum):
    INIT = "init" 
    START = "start" 
    PAUSE = "pause" 
    SKIP = "skip" 
    RESET = "reset" 

# FIX:
# instead, this should be set in flask.g or otherwise made global; this assignment isn't actually run due to how flask works
runtime_mode = RuntimeMode.INIT

"""
Sets the runtime mode according to the to the value associated with
the key "runtime_mode" when receiving a POST request.
"""
@app.post("/")
def handle_post():
    def parse_runtime_mode(s):
        print(s)
        match s.lower():
            case 'start': return RuntimeMode.START
            case 'pause': return RuntimeMode.PAUSE
            case 'skip' : return RuntimeMode.SKIP
            case 'reset': return RuntimeMode.RESET
            case _      : return RuntimeMode.INIT
    #FIX: this illustrates the need for the fix described above
    nonlocal runtime_mode
    runtime_mode = parse_runtime_mode(request.form["runtime_mode"])
    print(runtime_mode.value)
    return runtime_mode.value

"""
Gets the runtime mode
"""
@app.get("/runtime_mode")
def handle_get():
    return runtime_mode.value

@app.route("/")
def render(runtime_mode=RuntimeMode.INIT):
    return render_template("index.html", runtime_mode=runtime_mode.value, segments=segments_json)
