var rerenderYAxis, rerenderXAxis, renewYMax, pStart = 0.8, pStop = 0.9, getMaxs, getXs;

var xRule = {
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 6,
    8: 4,
    9: 4,
    10: 5,
    11: 5,
    12: 6,
    13: 6,
    14: 6
};

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var charm = new Telecharm();

function Telecharm() {
    this.mainChart = {
        viewBox: {
            width: 0,
            length: 0
        },
        element: {
            width: 0,
            length: 0
        },
        Xs: null,
        Ys: {},
        colors: {},
        dotsCount: {},
        dislayedCarts: new Set(),
        maxY: -Infinity,
        svg: null
    };
    // axisX: {

    // },
    // axisY: {},
    this.preview = {
        viewBox: {
            width: 0,
            length: 0
        },
        element: {
            width: 0,
            length: 0
        },
        carrier: {
            vbWidth: 0,
            vbHeight: 0
        }
    };
}

Telecharm.prototype.setMainChartDim = function(width, length) {
    this.mainChart.element.width = width;
    this.mainChart.element.length = length;
};

Telecharm.prototype.setMainChartDimVB = function(width, length) {
    this.mainChart.viewBox.width = width;
    this.mainChart.viewBox.length = length;
};

Telecharm.prototype.setXs = function(Xs) {
    this.mainChart.Xs = Xs.slice(0);
};

Telecharm.prototype.setYs = function(name, Ys, color) {
    this.mainChart.dotsCount[name] = Ys.length;
    this.mainChart.Ys[name] = Ys.slice(0);
    this.mainChart.dislayedCarts.add(name);
    this.mainChart.colors[name] = color;

    this.setMaxY(Ys);
};

Telecharm.prototype.setMaxY = function(Ys) {
    this.mainChart.maxY = Math.max(this.mainChart.maxY, ...Ys);
};

Telecharm.prototype.setChartSvg = function(svg) {
    this.mainChart.svg = svg;
};

document.addEventListener("DOMContentLoaded", () => {
    let svg = initAxis(1000, 500, data[0]);
    document.body.appendChild(svg);

    svg = drawMainChart(1000, 500, data[0]);
    svg.style.position = "absolute";
    svg.style.top = 0;
    svg.style.left = 0;
    document.body.appendChild(svg);

    svg = drawPreviewChart(1000, 50, data[0], svg);
    document.body.appendChild(svg);
});

function createLine(coords, stroke) {
    let line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    line.setAttribute("x1", coords[0]);
    line.setAttribute("y1", coords[1]);
    line.setAttribute("x2", coords[2]);
    line.setAttribute("y2", coords[3]);

    line.style.stroke = stroke;

    return line;
}

function drawMainChart(width, height, d) {
    let ns = "http://www.w3.org/2000/svg",
        svg = document.createElementNS(ns, "svg"),
        vbWidth, vbHeight, N, maxY, Ys,
        axisYName;


    Ys = d.columns[1];
    N = Ys.length - 1;
    axisYName = Ys[0];
    maxY = Math.max(...Ys.slice(1));

    vbHeight = maxY;
    vbWidth = vbHeight * width / height;

    charm.setMainChartDim(width, height);
    charm.setMainChartDimVB(vbWidth, vbHeight);
    charm.setXs(d.columns[0].slice(1).map(d => new Date(d)));
    charm.setYs(axisYName, Ys.slice(1), d.colors[Ys[0]]);

    svg.setAttribute("viewBox", [0, 0, vbWidth, vbHeight].join(" "));

    svg.style.width = width + "px";
    svg.style.height = height + "px";
    svg.style.display = "inline-block";

    drawChart(svg, {
        viewBoxHeight: vbHeight,
        viewBoxWidth: vbWidth,
        dotsCount: N,
        dots: Ys,
        lineStroke: d.colors[Ys[0]],
        lineStrokeWidth: "1px",
        chartGroupId: "mainChart"
    });

    return svg;
}

function drawPreviewChart(width, height, d, mainChartSvg) {
    let ns = "http://www.w3.org/2000/svg",
        svg = document.createElementNS(ns, "svg"),
        vbWidth, vbHeight, N, maxY, Ys,
        axisYName;


    Ys = d.columns[1];
    N = Ys.length - 1;
    axisYName = Ys[0];
    maxY = Math.max(...Ys.slice(1));

    vbHeight = maxY;
    vbWidth = vbHeight * width / height;

    svg.setAttribute("viewBox", [0, 0, vbWidth + 10, vbHeight].join(" "));

    svg.style.width = width + "px";
    svg.style.height = height + "px";
    svg.style.display = "inline-block";

    drawChart(svg, {
        viewBoxHeight: vbHeight,
        viewBoxWidth: vbWidth,
        dotsCount: N,
        dots: Ys,
        lineStroke: d.colors[Ys[0]],
        lineStrokeWidth: "1px",
        mask: "sliderMask",
        chartGroupId: "previewChart"
    });

    drawPreviewSlider(svg, {
        viewBoxHeight: vbHeight,
        viewBoxWidth: vbWidth,
        startPos: vbWidth * pStart,
        endPos: vbWidth * pStop,
        width: width,
        mainChart: mainChartSvg,
        chartGroupId: "previewChart"
    });

    return svg;
}

function drawPreviewSlider(svg, options) {
    let vbHeight = options.viewBoxHeight,
        vbWidth = options.viewBoxWidth,
        startPos = options.startPos,
        endPos = options.endPos,
        sidesOpacity = 0.4,
        maskId = "sliderMask",
        width = options.width,
        koef = vbWidth / width,
        mainChartSvg = options.mainChart,
        sideHandleWidth = 0.1,
        edgeHeight = 0.1;

    let mask = document.createElementNS("http://www.w3.org/2000/svg", "mask");

    mask.id = maskId;

    let maskRectLeft = document.createElementNS("http://www.w3.org/2000/svg", "rect");

    maskRectLeft.setAttribute("x", "0");
    maskRectLeft.setAttribute("y", "0");
    maskRectLeft.setAttribute("width", startPos);
    maskRectLeft.setAttribute("height", vbHeight);

    maskRectLeft.style.fill = "white";
    maskRectLeft.style.fillOpacity = sidesOpacity;

    mask.appendChild(maskRectLeft);

    let maskRectCenter = document.createElementNS("http://www.w3.org/2000/svg", "rect");

    maskRectCenter.setAttribute("x", startPos + 1 + sideHandleWidth * (endPos - startPos));
    maskRectCenter.setAttribute("y", edgeHeight * vbHeight);
    maskRectCenter.setAttribute("width", endPos - startPos - 2 * sideHandleWidth * (endPos - startPos));
    maskRectCenter.setAttribute("height", vbHeight * (1 - 2 * edgeHeight));

    maskRectCenter.style.fill = "white";
    maskRectCenter.style.fillOpacity = 0.7;

    mask.appendChild(maskRectCenter);

    let maskRectRight = document.createElementNS("http://www.w3.org/2000/svg", "rect");

    maskRectRight.setAttribute("x", endPos);
    maskRectRight.setAttribute("y", "0");
    maskRectRight.setAttribute("width", vbWidth - endPos);
    maskRectRight.setAttribute("height", vbHeight);

    maskRectRight.style.fill = "white";
    maskRectRight.style.fillOpacity = sidesOpacity;

    mask.appendChild(maskRectRight);
    svg.appendChild(mask);

    // left
    let rectLeft = document.createElementNS("http://www.w3.org/2000/svg", "rect");

    rectLeft.setAttribute("x", "0");
    rectLeft.setAttribute("y", "0");
    rectLeft.setAttribute("width", startPos);
    rectLeft.setAttribute("height", vbHeight);
    rectLeft.setAttribute("mask", "url(#" + maskId + ")");

    rectLeft.style.fill = "#C7C7C7";
    rectLeft.style.fillOpacity = sidesOpacity;

    svg.appendChild(rectLeft);

    let rectCenter = document.createElementNS("http://www.w3.org/2000/svg", "rect");

    rectCenter.setAttribute("x", startPos + 1);
    rectCenter.setAttribute("y", "0");
    rectCenter.setAttribute("width", endPos - startPos);
    rectCenter.setAttribute("height", vbHeight);
    rectCenter.setAttribute("mask", "url(#" + maskId + ")");

    rectCenter.style.fillOpacity = 0.8;
    rectCenter.style.fill = "#C7C7C7";

    svg.appendChild(rectCenter);

    let rectLeftHandle = document.createElementNS("http://www.w3.org/2000/svg", "rect");

    rectLeftHandle.setAttribute("x", startPos + 1);
    rectLeftHandle.setAttribute("y", "0");
    rectLeftHandle.setAttribute("width", sideHandleWidth * (endPos - startPos));
    rectLeftHandle.setAttribute("height", vbHeight);
    rectLeftHandle.setAttribute("mask", "url(#" + maskId + ")");

    rectLeftHandle.style.fillOpacity = 0.1;

    svg.appendChild(rectLeftHandle);

    let rectRightHandle = document.createElementNS("http://www.w3.org/2000/svg", "rect");

    rectRightHandle.setAttribute("x", endPos - sideHandleWidth * (endPos - startPos));
    rectRightHandle.setAttribute("y", "0");
    rectRightHandle.setAttribute("width", sideHandleWidth * (endPos - startPos));
    rectRightHandle.setAttribute("height", vbHeight);
    rectRightHandle.setAttribute("mask", "url(#" + maskId + ")");

    rectRightHandle.style.fillOpacity = 0;

    svg.appendChild(rectRightHandle);

    // right
    let rectRight = document.createElementNS("http://www.w3.org/2000/svg", "rect");

    rectRight.setAttribute("x", endPos);
    rectRight.setAttribute("y", "0");
    rectRight.setAttribute("width", vbWidth - endPos);
    rectRight.setAttribute("height", vbHeight);
    rectRight.setAttribute("mask", "url(#" + maskId + ")");

    rectRight.style.fill = "#C7C7C7";
    rectRight.style.fillOpacity = sidesOpacity;

    svg.appendChild(rectRight);

    var mainChartG = document.getElementById("mainChart");

    var { width: mainVBW } = mainChartSvg.viewBox.animVal;
    mainChartG.setAttribute("transform", "scale(" + vbWidth / (endPos - startPos) + " 1) translate(" + -1 * mainVBW * startPos / vbWidth + " 0)");

    var lastMousePosX;

    var mouseMoveHandler = function(e) {
        let dX = koef * (e.pageX - lastMousePosX);
        lastMousePosX = e.pageX;

        if (dX > 0) {
            dX = dX > rectRight.width.animVal.value ? rectRight.width.animVal.value : dX;
        } else {
            dX = -1 * dX > rectLeft.width.animVal.value ? -1 * rectLeft.width.animVal.value : dX;
        }

        if (dX == 0) {
            return;
        }

        maskRectLeft.setAttribute("width", maskRectLeft.width.animVal.value + dX);
        maskRectCenter.setAttribute("x", maskRectCenter.x.animVal.value + dX);
        maskRectRight.setAttribute("x", maskRectRight.x.animVal.value + dX);
        maskRectRight.setAttribute("width", maskRectRight.width.animVal.value - dX);

        rectLeft.setAttribute("width", rectLeft.width.animVal.value + dX);
        rectLeftHandle.setAttribute("x", rectLeftHandle.x.animVal.value + dX);
        rectCenter.setAttribute("x", rectCenter.x.animVal.value + dX);
        rectRightHandle.setAttribute("x", rectRightHandle.x.animVal.value + dX);
        rectRight.setAttribute("x", rectRight.x.animVal.value + dX);
        rectRight.setAttribute("width", rectRight.width.animVal.value - dX);

        let maxs = getMaxs();
        mainChartG.setAttribute("transform", " scale(" + vbWidth / (endPos - startPos) + " " + (maxs.maxY / maxs.currMaxY) +") translate(" + -1 * mainVBW * (rectCenter.x.animVal.value + dX) / vbWidth + " " + (maxs.currMaxY - maxs.maxY) + ")");
        // mainChartG.setAttribute("transform", " scale(" + vbWidth / (endPos - startPos) + " 1) translate(" + -1 * mainVBW * (rectCenter.x.animVal.value + dX) / vbWidth + " 0)");

        startPos += dX;
        endPos += dX;

        pStart = startPos / vbWidth;
        pStop = endPos / vbWidth;

        rerenderXAxis();
        rerenderYAxis();
    };

    rectCenter.onmousedown = function(e) {
        lastMousePosX = e.pageX;
        document.onmousemove = mouseMoveHandler;
        document.onmouseup = function() {
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };

    var leftHandlerDrag = function(e) {
        let dX = koef * (e.pageX - lastMousePosX);
        lastMousePosX = e.pageX;

        if (dX > 0) {
            dX = dX > rectRight.width.animVal.value ? rectRight.width.animVal.value : dX;
        } else {
            dX = -1 * dX > rectLeft.width.animVal.value ? -1 * rectLeft.width.animVal.value : dX;
        }

        if (dX == 0) {
            return;
        }

        startPos += dX;
        pStart = startPos / vbWidth;

        maskRectLeft.setAttribute("width", maskRectLeft.width.animVal.value + dX);
        maskRectCenter.setAttribute("x", maskRectCenter.x.animVal.value + dX);
        maskRectCenter.setAttribute("width", maskRectCenter.width.animVal.value - dX);

        rectLeft.setAttribute("width", rectLeft.width.animVal.value + dX);
        rectLeftHandle.setAttribute("x", rectLeftHandle.x.animVal.value + dX);
        rectCenter.setAttribute("x", rectCenter.x.animVal.value + dX);
        rectCenter.setAttribute("width", rectCenter.width.animVal.value - dX);

        let maxs = getMaxs();
        // mainChartG.setAttribute("transform", " scale(" + vbWidth / (endPos - startPos) + " 1) translate(" + -1 * mainVBW * (rectCenter.x.animVal.value + dX) / vbWidth + " 0)");
        mainChartG.setAttribute("transform", " scale(" + vbWidth / (endPos - startPos) + " " + (maxs.maxY / maxs.currMaxY) +") translate(" + -1 * mainVBW * (rectCenter.x.animVal.value + dX) / vbWidth + " " + (maxs.currMaxY - maxs.maxY) + ")");

        rerenderXAxis();
        rerenderYAxis();
    };

    rectLeftHandle.onmousedown = function(e) {
        lastMousePosX = e.pageX;
        document.onmousemove = leftHandlerDrag;
        document.onmouseup = function() {
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };

    var rightHandlerDrag = function(e) {
        let dX = koef * (e.pageX - lastMousePosX);
        lastMousePosX = e.pageX;

        if (dX > 0) {
            dX = dX > rectRight.width.animVal.value ? rectRight.width.animVal.value : dX;
        } else {
            dX = -1 * dX > rectLeft.width.animVal.value ? -1 * rectLeft.width.animVal.value : dX;
        }

        if (dX == 0) {
            return;
        }

        endPos += dX;
        pStop = endPos / vbWidth;

        maskRectCenter.setAttribute("width", maskRectCenter.width.animVal.value + dX);
        maskRectRight.setAttribute("x", maskRectRight.x.animVal.value + dX);
        maskRectRight.setAttribute("width", maskRectRight.width.animVal.value - dX);

        rectCenter.setAttribute("width", rectCenter.width.animVal.value + dX);
        rectRightHandle.setAttribute("x", rectRightHandle.x.animVal.value + dX);
        rectRight.setAttribute("x", rectRight.x.animVal.value + dX);
        rectRight.setAttribute("width", rectRight.width.animVal.value - dX);

        let maxs = getMaxs();

        mainChartG.setAttribute("transform", " scale(" + vbWidth / (endPos - startPos) + " " + (maxs.maxY / maxs.currMaxY) +") translate(" + -1 * mainVBW * (rectCenter.x.animVal.value + dX) / vbWidth + " " + (maxs.currMaxY - maxs.maxY) + ")");

        rerenderXAxis();
        rerenderYAxis();
    };

    rectRightHandle.onmousedown = function(e) {
        lastMousePosX = e.pageX;
        document.onmousemove = rightHandlerDrag;
        document.onmouseup = function() {
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };
}

function initAxis(width, height, d) {
    let ns = "http://www.w3.org/2000/svg",
        svg = document.createElementNS(ns, "svg"),
        vbWidth, vbHeight, N, maxY, Ys, Xs,
        axisYName;


    Ys = d.columns[1];
    N = Ys.length - 1;
    axisYName = Ys[0];
    maxY = Math.max(...Ys.slice(1));

    Xs = d.columns[0].slice(1).map(d => new Date(d));

    vbHeight = maxY;
    vbWidth = vbHeight * width / height;

    svg.setAttribute("viewBox", [0, 0, vbWidth + 10, vbHeight].join(" "));

    svg.style.width = width + "px";
    svg.style.height = height + "px";
    svg.style.display = "inline-block";

    let style = document.createElementNS("http://www.w3.org/2000/svg", "style");

    style.innerHTML = ".axis { font: normal 5px sans-serif; }";

    svg.appendChild(style);

    getMaxs = function() {
        let dotsStart = Math.floor(N * pStart),
            dotsEnd = Math.round(N * pStop),
            currMaxY = Math.max(...Ys.slice(dotsStart, dotsEnd));

        return {
            maxY,
            currMaxY
        };

    };

    rerenderYAxis = function() {
        let { currMaxY: currVBHeight } = getMaxs(),
            Y = 0;

        dY = 2 * currVBHeight / 11;

        while (g.children.length) {
            g.children[0].remove();
        }

        // g.setAttribute("transform", "scale(1 " + maxY/currVBHeight + ") translate(0 " + (currVBHeight - maxY) + ")");
        g.setAttribute("transform", "scale(1 " + maxY/currVBHeight + ")");

        for (let i = 0; i < 6 ; i++) {
            let line = createLine([0, currVBHeight - Y, vbWidth, currVBHeight - Y], "#BBBBBB");

            line.style.strokeWidth = "0.5px";

            g.appendChild(line);

            let text = document.createElementNS("http://www.w3.org/2000/svg", "text");

            text.setAttribute("class", "axis");
            text.setAttribute("x", 0);
            text.setAttribute("y", currVBHeight - Y - 5);
            text.setAttribute("fill", "#777777");

            text.innerHTML = Math.round(Y);

            g.appendChild(text);

            Y += dY;
        }
    };

    getXs = function() {
        let dotsStart = Math.floor(N * pStart),
            dotsEnd = Math.round(N * pStop);

        return {
            viewXs: Xs.slice(dotsStart, dotsEnd)
        };
    };

    rerenderXAxis = function() {
        var { viewXs } = getXs(),
            len = viewXs.length,
            segDotsLen, X = 0, dX, segments, startDotX;

        if (len < 15) {
            segments = xRule[len];
        } else {
            segments = len % 6 < len % 5 ? 6 : 5;
        }

        segDotsLen = Math.floor(len / segments);

        while (gX.children.length) {
            gX.children[0].remove();
        }

        dX = segDotsLen * vbWidth / len;
        startDotX = Math.floor((len - segDotsLen * (segments - 1)) / 2);
        X = startDotX * vbWidth / len;

        for (let i = startDotX; i < len; i += segDotsLen) {
            let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            let date = viewXs[i];

            text.setAttribute("class", "axis");
            text.setAttribute("x", X);
            text.setAttribute("y", vbHeight - 10);
            text.setAttribute("fill", "#777777");

            text.innerHTML = date.getDate() + " " + months[date.getMonth()];

            gX.appendChild(text);

            X += dX;
        }
    };

    let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    let gX = document.createElementNS("http://www.w3.org/2000/svg", "g");

    // g.id = "axis";

    rerenderYAxis();
    rerenderXAxis();

    svg.appendChild(g);
    svg.appendChild(gX);

    return svg;
}

function drawChart(svg, options) {
    let N = options.dotsCount,
        vbHeight = options.viewBoxHeight,
        dX = options.viewBoxWidth / (N - 1),
        X = 0,
        lineStroke = options.lineStroke,
        lineStrokeWidth = options.lineStrokeWidth,
        Ys = options.dots,
        maskId = options.mask;

    let g = document.createElementNS("http://www.w3.org/2000/svg", "g");

    g.id = options.chartGroupId;

    for (i = 1; i < N ; i++) {
        let line = createLine([X, vbHeight - Ys[i], X + dX, vbHeight - Ys[i + 1]], lineStroke);
        line.style.strokeWidth = lineStrokeWidth;
        line.setAttribute("vector-effect", "non-scaling-stroke");

        if (maskId) {
            line.setAttribute("mask", "url(#" + maskId + ")");
        }

        g.appendChild(line);

        X += dX;
    }

    svg.appendChild(g);

    return svg;
}


