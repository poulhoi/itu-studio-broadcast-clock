import os
from flask import Flask, request, render_template, g, redirect, url_for
from werkzeug.utils import secure_filename
from . import read_segments, db

def parse_runtime_mode(s):
    s = s.lower()
    if s == 'start': return 'start'
    if s == 'pause': return 'pause'
    if s == 'skip' : return 'skip'  
    if s == 'reset': return 'reset' 
    return 'init'

UPLOAD_FOLDER='data'
ALLOWED_EXTENSIONS = { 'csv', 'txt' }

def allowed_file(filename):
    return '.' in filename and \
       filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY = "dev",
        DATABASE = os.path.join(app.instance_path, 'flaskr.sqlite'),
        UPLOAD_FOLDER = os.path.join(app.root_path, UPLOAD_FOLDER),
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

    def read_segments():
        segments_file = os.path.join(app.config['UPLOAD_FOLDER'], 'segments.csv')
        if os.path.isfile(segments_file):
            segments = read_segments.segments_json(segments_file)
        else:
            segments = '[]'
        return segments

    @app.route("/")
    def index():
        app_db = db.get_db()
        app_db.execute("delete from state")
        app_db.execute("insert into state (runtime_mode) values ('init')")
        app_db.commit()
        segments = read_segments()
        return render_template("index.html", runtime_mode='init', segments=segments)

    @app.route("/upload", methods=['GET', 'POST'])
    def upload():
        print()
        if request.method =='POST':
            if 'file' not in request.files:
                return redirect(request.url)
            file = request.files['file']
            if file.filename == '':
                return redirect(request.url)
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                # return redirect(url_for('index'))
                return "Upload succesful"
        return render_template("upload.html")

    db.init_app(app)
    return app
