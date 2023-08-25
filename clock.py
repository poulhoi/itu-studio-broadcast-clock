from flask import Flask, request, render_template, g
import os
from enum import Enum
import read_segments
import db

# TODO: there is still some weirdness. Next step is to start over with the tutorial:
# https://flask.palletsprojects.com/en/2.3.x/tutorial/layout/
# to make sure the structure is correct

class RuntimeMode(Enum):
    INIT = "init" 
    START = "start" 
    PAUSE = "pause" 
    SKIP = "skip" 
    RESET = "reset" 

def parse_runtime_mode(s):
    match s.lower():
        case 'start': return RuntimeMode.START.value
        case 'pause': return RuntimeMode.PAUSE.value
        case 'skip' : return RuntimeMode.SKIP.value
        case 'reset': return RuntimeMode.RESET.value
        case _      : return RuntimeMode.INIT.value

def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY = "w*N7nnUDp7^oVJ",
        DATABASE = os.path.join(app.instance_path, 'clock.sqlite')
    )
    db.init_app(app)

    if test_config is None:
        app.config.from_pyfile('config.py', silent=True)
    else:
        app.config.from_mapping(test_config)

    @app.post("/")
    def handle_post():
        g.runtime_mode= parse_runtime_mode(request.form["runtime_mode"])
        return g.runtime_mode

    @app.get("/runtime_mode")
    def handle_get():
        return g.runtime_mode
        # return session['runtime_mode']

    @app.route("/")
    def render(runtime_mode=RuntimeMode.INIT):
        g.runtime_mode = runtime_mode.value
        return render_template("index.html", runtime_mode=runtime_mode.value, segments=read_segments.segments_json())

    return app
