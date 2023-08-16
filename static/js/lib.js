// Areas of the canvas
class Area {
    constructor(x1, y1, x2, y2) {
        this.upperLeft = new Two.Vector(x1, y1);
        this.lowerRight = new Two.Vector(x2, y2);
        this.center = new Two.Vector(x1 + (x2 - x1) / 2, y1 + (y2 - y1) / 2);
        this.width = x2 - x1;
        this.height = y2 - y1;
    }
};

// Segments of the clock
class Segment {
    constructor(title, type, length, chronology, total) {
        this.title = title;
        this.type = type;
        this.length = length;
        this.chronology = chronology;
        this.total = total;
        // group of all drawn elements related to this segment
        this.group = two.makeGroup();
    }
}

// helper function for debugging areas
function areaBorder(area, label) {
    let rect = two.makeRectangle(area.center.x, area.center.y, area.width, area.height);
    let txt = two.makeText(label, area.center.x, area.upperLeft.y + 20);
    rect.stroke = 'red'; txt.stroke = 'red';
    rect.fill = config.bgCol; txt.fill = 'red';
    return rect;
}

// Read in and create segments from Django, as sub-arrays indexed by slice group
function makeSegments(raw) {
    lastSlicegroup = 0;
    segs = [];
    for (const i in raw) {
        const title = raw[i]["title"];
        const typeString = raw[i]["type"];
        const length = parseInt(raw[i]["length"]);
        const chronology = parseInt(raw[i]["chronology"]);
        const total = parseInt(raw[i]["total"]);
        const slicegroup = parseInt(raw[i]["slicegroup"]);
        if (slicegroup != lastSlicegroup || segs[slicegroup] == null) {
            segs.push([]);
        }
        const seg = new Segment(title, typeString, length, chronology, total);
        segs[slicegroup].push(seg);
        lastSlicegroup = slicegroup;
    }
    return segs;
}

// Numberical clock helpers
function time() {
    return new Date().getTime();
}

function hms() {
    const d = new Date();
    let h = d.getHours();
    let m = d.getMinutes();
    let s = d.getSeconds();
    return [h, m, s];
}

function timeStr() {
    [h, m, s] = hms();
    hh = h < 10 ? '0' + h : h;
    mm = m < 10 ? '0' + m : m;
    ss = s < 10 ? '0' + s : s;
    return hh + ':' + mm + ':' + ss;
}

// Circular clock helpers
function carToPol(x, y) {
    const r = Math.sqrt(x * x + y * y);
    const theta = Math.atan(y / x);
    return new Two.Vector(r, theta);
}

function polToCar(r, angle) {
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    return new Two.Vector(x, y);
}

function clockAngle(t) {
    return (t / 60 * 2 - 0.5) * Math.PI;
}

// Drawing function generators
function func_drawSliceLine(config, clockCircX, clockCircY) {
    return (t) => {
        const angle = clockAngle(t);
        const endPointRel = polToCar(clockRadius, angle);
        const endPointX = clockCircX + endPointRel.x;
        const endPointY = clockCircY + endPointRel.y;
        const slice = two.makeLine(clockCircX, clockCircY, endPointX, endPointY);
        slice.stroke = config.clockCol;
        return slice;
    };
}

function func_drawSliceText(config, clockCircX, clockCircY, clockRadius) {
    return (title, t0, t1) => {
        const angle = clockAngle((t1 - t0) / 2 + t0);
        txtPosRel = polToCar(clockRadius * 0.92, angle);
        const txtX = clockCircX + txtPosRel.x;
        const txtY = clockCircY + txtPosRel.y;
        let txt = two.makeText(title, txtX, txtY);
        txt.size = config.segmentTextSize;
        const sizeRatio = txt.getBoundingClientRect().width / clockRadius;
        // reduce title if necessary
        if (sizeRatio > 1) {
            txt.remove();
            txt = two.makeText(reduceString(title, sizeRatio), txtX, txtY);
            txt.size = config.segmentTextSize;
        }
        // prevent text being upside down
        if (angle < Math.PI * 0.5 || angle > Math.PI * 1.5) {
            txt.rotation = angle;
            txt.alignment = 'right';
        } else {
            txt.rotation = angle + Math.PI;
            txt.alignment = 'left';
        }
        // const br = txt.getBoundingClientRect();
        // const rect = two.makeRectangle(txtX, txtY, br.width, br.height);
        // rect.stroke = 'red';
        // rect.fill = 'rgba(0,0,0,0)';
        txt.fill = txt.stroke = config.clockCol;
        return txt;
    }
}

function func_drawSlices(config, segments) {
    return (t) => {
        let i = Math.max(Math.floor((t - 1) / 60), 0);
        // keep current clock if there are no more slice groups
        if (i > segments.length - 1) return;
        // remove existing slices
        if (i > 0) {
            for (let j = 0; j < segments[i - 1].length; j++) {
                const seg = segments[i - 1][j];
                console.log(seg.group);
                seg.group.remove();
                seg.group = two.makeGroup();
            }
        }
        let slice, seg, arcSeg, txt = null;
        for (let j = 0; j < segments[i].length; j++) {
            seg = segments[i][j];
            arcSeg = highlightClockSector(seg.total - seg.length, seg.total, config.segColors[seg.type]);
            txt = drawSliceText(seg.title, seg.total - seg.length, seg.total);
            slice = drawSliceLine(seg.total);
            seg.group.add(arcSeg);
            seg.group.add(txt);
            // seg.group.add(slice);
        }
        // draw 12 o' clock line for last segment as dotted if it overlaps with next 
        if (i + 1 < segments.length && seg.title == segments[i + 1][0].title) {
            slice.dashes = [5];
        }
        // if segment doesn't end on the hour and it's the last (i.e. the last segment in the schedule)
        if (seg.total % 60 > 0) {
            const b = 30; const col = `rgb(${b}, ${b}, ${b})`;
            highlightClockSector(seg.total, (Math.floor(seg.total / 60) + 1) * 60, col);
            drawSliceLine(seg.total);
            drawSliceLine(0);
        }
    }
}

function func_highlightClockSector(config, clockRadius, clockCircX, clockCircY) {
    return (t0, t, col) => {
        const angleMargin = 0.0;
        const innerRadius = 0;
        const outerRadius = clockRadius - config.clockLineWidth * 0.5;
        const startAngle = clockAngle(t0) + angleMargin;
        const endAngle = clockAngle(t) - angleMargin;
        const sector = two.makeArcSegment(clockCircX, clockCircY, innerRadius, outerRadius, startAngle, endAngle);
        sector.stroke = sector.fill = col;
        return sector;
    }
}

// The arm of the clock
function func_drawArm(config, clockCircX, clockCircY) {
    return (t, arm) => {
        if (arm == null) {
            arm = two.makeRoundedRectangle(0, 0, config.clockArmW, clockRadius + config.clockArmLength, config.clockArmRoundness);
        }
        const angle = clockAngle(t);
        // position is center of arm, not endpoint
        armPosRel = polToCar(clockRadius * 0.5 + config.clockArmLength * 0.5, angle);
        armX = clockCircX + armPosRel.x;
        armY = clockCircY + armPosRel.y;
        arm.position = new Two.Vector(armX, armY);
        arm.stroke = arm.fill = config.clockArmCol;
        arm.rotation = angle + Math.PI * 0.5;
        return arm;
    }
}

// Reformat titles that are too long
function reduceString(t, ratio) {
    i = Math.floor(t.length / ratio);
    return t.slice(0, i) + "...";
}

// draw rectangle from top-left coordinates
const drawRect = (x, y, w, h, strokecol, fillcol, lw) => {
    const rect = two.makeRectangle(x + w / 2, y + h / 2, w, h);
    rect.stroke = strokecol;
    rect.fill = fillcol;
    rect.linewidth = lw;
    return rect;
}

function addLine(group, msg, x, y)  {
    const line = two.makeText(msg, x, y);
    line.alignment = 'left'
    line.fill = config.segStatusCol;
    line.size = config.segStatusHeaderSize;
    group.add(line);
    return line;
}

function func_drawSegmentStatus(config, infoArea, numClockBorder) {
    return (seg, nextSeg) => {
        if (seg != null) {
            const segStatusBorderX = infoArea.center.x - infoArea.width*0.5;
            const segStatusBorderY = numClockBorder.position.y - numClockBorder.height*0.5;
            const segStatusBorder = drawRect(
                segStatusBorderX,
                segStatusBorderY,
                infoArea.width*0.9,
                infoArea.height*0.6,
                config.bgCol,
                config.bgCol,
                config.numClockBorderLineWidth
            );

            const txtSize = config.segStatusHeaderSize;
            const segTextY = segStatusBorder.position.y - segStatusBorder.height*0.5 + txtSize*0.5 + config.segStatusMarginY;
            const segTypeFlagY = segTextY - txtSize*0.5;
            const nextSegTextY = segStatusBorder.position.y + txtSize*0.5;
            const nextSegTypeFlagY = nextSegTextY - txtSize * 0.5;

            const segTypeFlagX = infoArea.center.x - infoArea.width*0.5 + config.segStatusTypeFlagMarginX; 
            const segTextX =  segTypeFlagX + config.segStatusTypeFlagW + config.segStatusTextMarginX;

            const getLineLengthRatio = (line) => {
                // fudgy solution; higher values of w_ tolerate longer titles; doesn't consider font
                const w_ = 0.45;
                const w = config.segStatusHeaderSize * line.length*w_; 
                return w / (segStatusBorder.width - config.segStatusTextMarginX - config.segStatusTypeFlagMarginX - config.segStatusTypeFlagW);
            }

            const reduceTitle = (txtGr) => {
                const fst = txtGr.children[1];
                const t = fst.value;
                if (getLineLengthRatio(t) > 1) {
                const ws = t.split(" ");
                let fstl = "";
                let idx = 0;
                do {
                    fst.value = fstl;
                    fstl += ws[idx] + " ";
                    idx++;
                } while (getLineLengthRatio(fstl) < 1);
                let sndl = t.substring(fst.value.length);
                let addEllipsis = false;
                while (getLineLengthRatio(sndl) > 1) {
                    sndl = sndl.substring(0, sndl.lastIndexOf(" "));
                    addEllipsis = true;
                }
                if (addEllipsis)
                    sndl += "...";
                snd = addLine(txtGr, sndl, fst.position.x, fst.position.y + fst.size + 10);
                }
            }

            const segmentStatus = two.makeGroup();

            const nowTypeCol = config.segColors[seg.type];
            const nowTypeFlag = drawRect(segTypeFlagX,
                segTypeFlagY,
                config.segStatusTypeFlagW,
                txtSize*3+20,
                config.clockCol,
                nowTypeCol,
                1
            );
            const nowHeader = two.makeGroup();
            nowHeader.add(nowTypeFlag);
            segmentStatus.add(nowHeader);
            addLine(nowHeader, "NOW:", segTextX, segTextY);
            addLine(nowHeader, seg.title, segTextX, segTextY + txtSize + 10);
            reduceTitle(nowHeader);

            if (nextSeg != null) {
                const nextTypeCol = config.segColors[nextSeg.type];
                const nextTypeFlag = drawRect(segTypeFlagX,
                    nextSegTypeFlagY,
                    config.segStatusTypeFlagW,
                    txtSize*3+20,
                    config.clockCol,
                    nextTypeCol,
                    1
                );
                const nextHeader = two.makeGroup();
                nextHeader.add(nextTypeFlag);
                addLine(nextHeader, "NEXT: ", segTextX, nextSegTextY);
                addLine(nextHeader, nextSeg.title, segTextX, nextSegTextY + txtSize + 10);
                reduceTitle(nextHeader);
                segmentStatus.add(nextHeader);
            }
            return segmentStatus;
        }
        return null;
    }
}

// returns [current segment, next segment] as an array.
// might return either as null, if on the last segment or later
function func_getSegmentStatus(segments) {
    return (t) => {
        let seg = null;
        let nextSeg = null;
        for (let i = 0; i < segments.length; i++) {
            for (let j = 0; j < segments[i].length; j++) {
                seg = segments[i][j];
                if (t > seg.total) continue;
                // if there is a nextSeg, find it
                if (j < segments[i].length - 1) {
                    nextSeg = segments[i][j + 1];
                } else if (i < segments.length - 1) {
                    nextSeg = segments[i + 1][0];
                }
                if (t >= seg.total - seg.length) {
                    return [seg, nextSeg];
                }
            }
        }
        return [null, null]
    }
}
