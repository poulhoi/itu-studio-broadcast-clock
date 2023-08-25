import * as lib from "./lib.js"
const config = lib.config;
const two = lib.two;

let currentTime = "";

let runtimeMode = "";

// TODO:
// do this once a second to refresh the status!
// then the runtime mode variable will change when the server receives a post request
// e.g. curl -X POST localhost:5000 -F "runtime_mode=skip
// still need a way to send post requests from js back to Flask, but that shouldn't be too bad 
function updRuntimeMode() {
    fetch('/runtime_mode').then(resp => resp.text())
                          .then(data => runtimeMode = data)
}
updRuntimeMode()

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

// Generate functions from lib.js
// const drawSliceLine = lib.func_drawSliceLine(clockCircX, clockCircY);
// const drawSliceText = lib.func_drawSliceText(clockCircX, clockCircY, clockRadius);
// const highlightClockSector = lib.func_highlightClockSector(clockRadius, clockCircX, clockCircY);
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

let t0 = lib.time();
let t, secs, mins, hour, prevMins, prevHour = 0;

function updSec() {
    updRuntimeMode()
    console.log(runtimeMode)
    switch(runtimeMode) {
        case 'start': 
            t = (lib.time() - t0) * 10;
            secs = t / 1000;
            mins = secs / 60;
            hour = Math.floor(mins / 60);
            if (mins != prevMins) {
                segmentStatus.remove();
                [seg, nextSeg] = getSegmentStatus(mins);
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
    // must be last to display correctly for some reason???
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
  if (frame % 30 == 0) { // approx 1-2 times per second
    updSec();
  }
  updFrame();
})
