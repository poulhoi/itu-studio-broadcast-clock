import * as lib from "./lib.js"
const config = lib.config;
const two = lib.two;

let runtimeMode = "init";

function updRuntimeMode() {
    fetch('/runtime_mode').then(resp => resp.text())
                          .then(data => runtimeMode = data)
                          .catch(error => console.log(error))
}

const clockArea = new lib.Area(0, 0, two.width * config.clockWProp, two.height);
const infoArea = new lib.Area(two.width * config.clockWProp, 0, two.width, two.height);

let clockGroup = two.makeGroup();

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
segmentStatus.opacity = segmentStatusOpacity;

let t0 = null
let t, secs, mins, hour, prevMins, prevHour = 0;

function updSec() {
    updRuntimeMode()
    switch(runtimeMode) {
        case 'start':
            if (t0 == null)
                t0 = lib.time()
            t = (lib.time() - t0) * 500;
            secs = t / 1000;
            mins = secs / 60;
            hour = Math.floor(mins / 60);
            if (mins != prevMins) {
                segmentStatus.remove();
                [seg, nextSeg] = getSegmentStatus(mins);
                if (seg == null)
                    break; // NOTE: simply stops the clock; should something else happen?
                segmentStatus = drawSegmentStatus(seg, nextSeg);
            }
            if (hour != prevHour)
                drawSlices(mins);
            segmentStatusBlinking = mins >= (seg.total - 1);
            arm = drawArm(mins, arm);
            prevHour = hour;
            prevMins = mins;
            break;
    }
    numClock.value = lib.timeStr();
}

function updFrame() {
  if (segmentStatusBlinking)
    segmentStatusOpacity = lib.tri((lib.time() - t0)*0.001);
  else
    segmentStatusOpacity = 1.;
  segmentStatus.opacity = segmentStatusOpacity;
}

// update block
two.bind('update', function (frame) {
  if (frame % 30 == 0) {
    updSec();
  }
  updFrame();
})
