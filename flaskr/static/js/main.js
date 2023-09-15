import * as lib from "./lib.js"
const config = lib.config;
const two = lib.two;

let runtimeMode = "init";
let forceRuntimeMode = null;

function updRuntimeMode() {
    if (forceRuntimeMode) {
        runtimeMode = forceRuntimeMode;
        forceRuntimeMode = null;
    } else {
        fetch('/runtime_mode').then(resp => resp.text())
                              .then(data => runtimeMode = data)
                              .catch(error => console.log(error))
    }
}

function postRuntimeMode(mode) {
    forceRuntimeMode = mode;
    const data = new FormData()
    data.append('runtime_mode', mode)
    fetch('/runtime_mode', {
        method: "POST",
        body: data
    })
}

const clockArea = new lib.Area(0, 0, two.width * config.clockWProp, two.height);
const infoArea = new lib.Area(two.width * config.clockWProp, 0, two.width, two.height);

let clockGroup = two.makeGroup();

// SEGMENTS_RAW is defined in index.html
const segments = lib.makeSegments(SEGMENTS_RAW);

// Numerical Clock
const numClock = two.makeText(lib.timeStr(), clockArea.center.x, clockArea.center.y * config.numClockYProp);
numClock.fill = config.clockCol;
numClock.size = config.numClockSize;
numClock.family = config.numClockFamily;

// Boundary rectangle of numerical clock
const br = numClock.getBoundingClientRect();
const numClockBorder = two.makeRectangle(
  numClock.position.x,
  numClock.position.y-6,
  br.width * config.numClockBorderWidthProp,
  br.height * config.numClockBorderHeightProp
);
numClockBorder.fill = 'rgba(0,0,0,0)';
numClockBorder.linewidth = config.numClockBorderLineWidth;
clockGroup.add(numClockBorder);

// Circular clock
const clockRadius = config.clockDiamProp * two.height / 2;
const clockCircX = clockArea.center.x;
const clockCircY = clockArea.height * config.clockYPosProp;
const clockCirc = two.makeCircle(clockCircX, clockCircY, clockRadius);
clockCirc.linewidth = config.clockLineWidth;
clockCirc.noFill();
clockGroup.add(clockCirc);
clockGroup.stroke = config.clockCol;

const drawSlices = lib.func_drawSlices(segments, clockCircX, clockCircY, clockRadius);
const drawArm = lib.func_drawArm(clockCircX, clockCircY, clockRadius);
const drawSegmentStatus = lib.func_drawSegmentStatus(infoArea, numClockBorder);
const getSegmentStatus = lib.func_getSegmentStatus(segments)

drawSlices(0);
let arm = drawArm(0, null);
let [seg, nextSeg] = getSegmentStatus(0);
let segmentStatusOpacity = 0.2;
let segmentStatusBlinking = false;
let segmentStatus = drawSegmentStatus(seg, nextSeg);
if (segmentStatus) 
    segmentStatus.opacity = segmentStatusOpacity;

let t0, t, paused, pauseLength, pauseStart, secs, mins, hour, prevMins, prevHour;

function initTime() {
    t0 = null
    t, secs, mins, hour, prevMins, prevHour, pauseLength, pauseStart = 0;
    paused = false;
}

function updTime() {
    if (t0 == null)
        return;
    t = (lib.time() - t0);
    secs = t / 1000;
    mins = secs / 60;
}

function runtimeInit() {
    arm = drawArm(0, arm);
    t0 = lib.time();
    updTime();
}

function runtimeStart() {
    if (t0 == null)
        t0 = lib.time();
    if(paused) {
        paused = false;
        t0 += pauseLength;
        pauseLength = 0;
    }
    updTime();
    if (mins != prevMins) {
        if (segmentStatus)
            segmentStatus.remove();
        [seg, nextSeg] = getSegmentStatus(mins);
        if (seg == null)
            return; // NOTE: simply stops the clock; should something else happen?
        segmentStatus = drawSegmentStatus(seg, nextSeg);
    }
    if (hour != prevHour)
        drawSlices(mins);
    segmentStatusBlinking = mins >= (seg.total - 1);
    arm = drawArm(mins, arm);
    prevHour = hour;
    prevMins = mins;
}

function runtimePause() {
    if (t0 == null)
        t0 = lib.time();
    if(!paused) {
        pauseStart = lib.time();
        paused = true;
    }
    pauseLength = (lib.time() - pauseStart);
}

function runtimeSkip() {
    if (t0 == null)
        t0 = lib.time();
    updTime();
    [seg, nextSeg] = getSegmentStatus(mins);
    if (seg == null)
        return; // NOTE: same applies as the 'start' case
    const remainingSeg = seg.total*60_000 - t;
    t0 -= remainingSeg;
    updTime();
    [seg, nextSeg] = getSegmentStatus(mins);
    if (segmentStatus)
        segmentStatus.remove();
    segmentStatus = drawSegmentStatus(seg, nextSeg);
    arm = drawArm(mins, arm);
    if (paused) {
        postRuntimeMode('pause');
    } else {
        postRuntimeMode('start');
    }
}

function runtimeReset() {
    initTime();
    postRuntimeMode('start');
}

function updSec() {
    updRuntimeMode();
    switch(runtimeMode) {
        case 'init' : runtimeInit() ; break;
        case 'start': runtimeStart(); break;
        case 'pause': runtimePause(); break;
        case 'skip' : runtimeSkip() ; break;
        case 'reset': runtimeReset(); break;
    }
    numClock.value = lib.timeStr();
}

function updFrame() {
    if (segmentStatusBlinking)
        segmentStatusOpacity = lib.tri((lib.time() - t0)*0.001);
    else
        segmentStatusOpacity = 1.;
    if (segmentStatus)
        segmentStatus.opacity = segmentStatusOpacity;
}

initTime()

// update block
two.bind('update', function (frame) {
    if (frame % 30 == 0) {
        updSec();
    }
    updFrame();
})
