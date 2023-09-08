import os
from flask import Flask, request, render_template, g
from . import read_segments, db

def parse_runtime_mode(s):
    match s.lower():
        case 'start': return 'start' 
        case 'pause': return 'pause' 
        case 'skip' : return 'skip'  
        case 'reset': return 'reset' 
        case _      : return 'init'

def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY = "dev",
        DATABASE=os.path.join(app.instance_path, 'flaskr.sqlite')
    )

    if test_config is None:
        app.config.from_pyfile('config.py', silent=True)
    else:
        app.config.from_mapping(test_config)

    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    @app.post("/runtime_mode")
    def handle_post():
        runtime_mode = parse_runtime_mode(request.form["runtime_mode"])
        app_db = db.get_db()
        app_db.execute(
            f"update state set runtime_mode = '{runtime_mode}'"
        )
        app_db.commit()
        return "posted:" + runtime_mode

    @app.get("/runtime_mode")
    def handle_get():
        app_db = db.get_db()
        row = app_db.execute(
            'select runtime_mode from state'
        ).fetchall()
        runtime_mode = row[0][0]
        return runtime_mode

    @app.route("/")
    def render():
        app_db = db.get_db()
        app_db.execute("delete from state")
        app_db.execute("insert into state (runtime_mode) values ('init')")
        app_db.commit()
        return render_template("index.html", runtime_mode='init', segments=read_segments.segments_json())

    db.init_app(app)

    return app
