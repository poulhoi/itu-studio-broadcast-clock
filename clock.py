from flask import Flask, request, render_template
from enum import Enum

app = Flask(__name__)

class RuntimeMode(Enum):
    INIT = 1
    START = 2
    PAUSE = 3
    SKIP = 4
    RESET = 5

runtime_mode = RuntimeMode.INIT

"""
Sets the runtime mode according to the to the value associated with
the key "runtime_mode" when receiving a POST request.
"""
@app.post("/")
def handle_post():
    def parse_runtime_mode(s):
        match s.lower():
            case 'start': return RunTimeMode.START
            case 'pause': return RuntimeMode.PAUSE
            case 'skip' : return RuntimeMode.SKIP
            case 'reset': return RuntimeMode.RESET
            case _      : return RuntimeMode.INIT
    runtime_mode = parse_runtime_mode(request.form["runtime_mode"])

@app.route("/")
def render(runtime_mode=RuntimeMode.INIT):
    return render_template("index.html", runtime_mode=runtime_mode.value)
