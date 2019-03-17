var rerenderYAxis, rerenderXAxis, renewYMax, pStart = 0.8, pStop = 0.9, getXs;

var rerenderLeft, rerenderCener, rerenderRight;

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
var charm = null;

function Telecharm(params) {
    this.svgns = "http://www.w3.org/2000/svg";
    this.current = null;
    this.container = null;

    this.mainChart = {
        viewBox: {
            width: 0,
            height: 0
        },
        element: {
            width: 0,
            height: 0
        },
        svg: null
    };

    this.dots = {
        Xs: null,
        Ys: {},
        colors: {},
        count: {},
        dislayedCharts: new Set(),
        maxY: -Infinity
    };

    this.axis = {
        viewBox: {
            width: 0,
            height: 0
        },
        element: {
            width: 0,
            height: 0
        },
        svg: null
    };

    this.preview = {
        viewBox: {
            width: 0,
            height: 0
        },
        element: {
            width: 0,
            height: 0
        },
        carrier: {
            vbWidth: 0,
            vbHeight: 0,
            begin: 0,
            end: 1,
            beginToRender: 0,
            endToRender: 1
        },
        svg: null
    };

    this.init(params);
}

Telecharm.prototype.init = function(params) {
    let mc = this.mainChart,
        pv = this.preview,
        ax = this.axis,
        Ys = params.data.columns[1];
        axisYName = Ys[0],
        container = document.getElementById(params.container),
        cW = container.offsetWidth,
        cH = container.offsetHeight;


    this.container = container;

    mc.element.width = "100%";
    mc.element.height = (1000 / 11) + "%";
    this.setXs(params.data.columns[0].slice(1).map(d => new Date(d)));
    this.setYs(Ys[0], Ys.slice(1), params.data.colors[axisYName]);
    mc.viewBox.height = this.dots.maxY;
    mc.viewBox.width = this.dots.maxY * cW / (10 * cH / 11);

    ax.element.width = mc.element.width;
    ax.element.height = mc.element.height;
    ax.viewBox.height = mc.viewBox.height;
    ax.viewBox.width = mc.viewBox.width;

    pv.element.width = "100%";
    pv.element.height = (100 / 11) + "%";
    pv.viewBox.height = this.dots.maxY;
    pv.viewBox.width = pv.viewBox.height * cW / (cH / 11);

    this.drawAxis();
    this.drawMainChart();
    this.drawPreviewChart();
};

Telecharm.prototype.setXs = function(Xs) {
    this.dots.Xs = Xs.slice(0);
};

Telecharm.prototype.setYs = function(name, Ys, color) {
    this.dots.count[name] = Ys.length;
    this.dots.colors[name] = color;
    this.dots.Ys[name] = Ys.slice(0);
    this.dots.dislayedCharts.add(name);
    this.current = name;

    this.setMaxY(Ys);
};

Telecharm.prototype.getCurrentYs = function() {
    return this.dots.Ys[this.current];
};

Telecharm.prototype.getCurrentColor = function() {
    return this.dots.colors[this.current];
};

Telecharm.prototype.setMaxY = function(Ys) {
    this.dots.maxY = Math.max(this.dots.maxY, ...Ys);
};

Telecharm.prototype.setChartSvg = function(svg) {
    this.mainChart.svg = svg;
};

Telecharm.prototype.getMaxs = function() {
    let Ys = this.getCurrentYs(),
        N = Ys.length,
        dotsStart = Math.floor(N * this.preview.carrier.begin),
        dotsEnd = Math.round(N * this.preview.carrier.end),
        currMaxY = Math.max(...Ys.slice(dotsStart, dotsEnd));

    return {
        maxY: this.dots.maxY,
        currMaxY
    };
};

Telecharm.prototype.drawMainChart = function() {
    let svg = document.createElementNS(this.svgns, "svg"),
        mc = this.mainChart;

    this.setChartSvg(svg);

    svg.setAttribute("viewBox", [0, 0, mc.viewBox.width, mc.viewBox.height].join(" "));

    svg.style.width = mc.element.width;
    svg.style.height = mc.element.height;
    svg.style.display = "block";
    svg.style.position = "absolute";
    svg.style.top = 0;
    svg.style.left = 0;

    this.drawChart(svg, {
        viewBoxHeight: mc.viewBox.height,
        viewBoxWidth: mc.viewBox.width,
        lineStrokeWidth: "1px",
        chartGroupId: "mainChart"
    });

    this.container.appendChild(svg);
}

Telecharm.prototype.drawChart = function(svg, options) {
    let Ys = this.getCurrentYs(),
        N = Ys.length - 1,
        vbHeight = options.viewBoxHeight,
        dX = options.viewBoxWidth / N,
        X = 0,
        lineStroke = this.getCurrentColor(),
        lineStrokeWidth = options.lineStrokeWidth,
        
        maskId = options.mask;

    let g = document.createElementNS(this.svgns, "g");

    g.id = options.chartGroupId;

    for (i = 1; i < N; i++) {
        let line = this.createLine([X, vbHeight - Ys[i], X + dX, vbHeight - Ys[i + 1]], lineStroke);
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
};

Telecharm.prototype.createLine = function(coords, stroke) {
    let line = document.createElementNS(this.svgns, "line");

    line.setAttribute("x1", coords[0]);
    line.setAttribute("y1", coords[1]);
    line.setAttribute("x2", coords[2]);
    line.setAttribute("y2", coords[3]);

    line.style.stroke = stroke;

    return line;
};

Telecharm.prototype.drawPreviewChart = function() {
    let svg = document.createElementNS(this.svgns, "svg"),
        pv = this.preview;

    svg.setAttribute("viewBox", [0, 0, pv.viewBox.width, pv.viewBox.height].join(" "));

    this.preview.svg = svg;

    svg.style.width = pv.element.width;
    svg.style.height = pv.element.height;
    svg.style.display = "block";
    svg.style.position = "absolute";
    svg.style.bottom = 0;
    svg.style.left = 0;

    this.drawChart(svg, {
        viewBoxHeight: pv.viewBox.height,
        viewBoxWidth: pv.viewBox.width,
        lineStrokeWidth: "1px",
        mask: "sliderMask",
        chartGroupId: "previewChart"
    });

    this.drawPreviewSlider();

    this.container.appendChild(svg);
};

Telecharm.prototype.drawPreviewSlider = function() {
    let pv = this.preview,
        vbHeight = pv.viewBox.height,
        vbWidth = pv.viewBox.width,
        startPos = vbWidth * pv.carrier.begin,
        endPos = vbWidth * pv.carrier.end,
        sidesOpacity = 0.4,
        maskId = "sliderMask",
        width = this.container.offsetWidth,
        koef = vbWidth / width,
        mainChartSvg = this.mainChart.svg,
        sideHandleWidth = 10 * koef,
        edgeHeight = 5 * koef,
        svg = this.preview.svg,
        me = this;

    let mask = document.createElementNS(this.svgns, "mask");

    mask.id = maskId;

    let maskRectLeft = document.createElementNS(this.svgns, "rect");

    maskRectLeft.setAttribute("x", "0");
    maskRectLeft.setAttribute("y", "0");
    maskRectLeft.setAttribute("width", startPos);
    maskRectLeft.setAttribute("height", vbHeight);

    maskRectLeft.style.fill = "white";
    maskRectLeft.style.fillOpacity = sidesOpacity;

    mask.appendChild(maskRectLeft);

    let maskRectCenter = document.createElementNS(this.svgns, "rect");

    maskRectCenter.setAttribute("x", startPos + 1 + sideHandleWidth);
    maskRectCenter.setAttribute("y", edgeHeight);
    maskRectCenter.setAttribute("width", endPos - startPos - 2 * sideHandleWidth);
    maskRectCenter.setAttribute("height", vbHeight - 2 * edgeHeight);

    maskRectCenter.style.fill = "white";
    maskRectCenter.style.fillOpacity = 0.7;

    mask.appendChild(maskRectCenter);

    let maskRectRight = document.createElementNS(this.svgns, "rect");

    maskRectRight.setAttribute("x", endPos);
    maskRectRight.setAttribute("y", "0");
    maskRectRight.setAttribute("width", vbWidth - endPos);
    maskRectRight.setAttribute("height", vbHeight);

    maskRectRight.style.fill = "white";
    maskRectRight.style.fillOpacity = sidesOpacity;

    mask.appendChild(maskRectRight);
    svg.appendChild(mask);

    // left
    let rectLeft = document.createElementNS(this.svgns, "rect");

    rectLeft.setAttribute("x", "0");
    rectLeft.setAttribute("y", "0");
    rectLeft.setAttribute("width", startPos);
    rectLeft.setAttribute("height", vbHeight);
    rectLeft.setAttribute("mask", "url(#" + maskId + ")");

    rectLeft.style.fill = "#C7C7C7";
    rectLeft.style.fillOpacity = sidesOpacity;

    svg.appendChild(rectLeft);

    let rectCenter = document.createElementNS(this.svgns, "rect");

    rectCenter.setAttribute("x", startPos + 1);
    rectCenter.setAttribute("y", "0");
    rectCenter.setAttribute("width", endPos - startPos);
    rectCenter.setAttribute("height", vbHeight);
    rectCenter.setAttribute("mask", "url(#" + maskId + ")");

    rectCenter.style.fillOpacity = 0.8;
    rectCenter.style.fill = "#C7C7C7";

    svg.appendChild(rectCenter);

    let rectLeftHandle = document.createElementNS(this.svgns, "rect");

    rectLeftHandle.setAttribute("x", startPos + 1);
    rectLeftHandle.setAttribute("y", "0");
    rectLeftHandle.setAttribute("width", sideHandleWidth);
    rectLeftHandle.setAttribute("height", vbHeight);
    rectLeftHandle.setAttribute("mask", "url(#" + maskId + ")");

    rectLeftHandle.style.fillOpacity = 0.1;

    svg.appendChild(rectLeftHandle);

    let rectRightHandle = document.createElementNS(this.svgns, "rect");

    rectRightHandle.setAttribute("x", endPos - sideHandleWidth);
    rectRightHandle.setAttribute("y", "0");
    rectRightHandle.setAttribute("width", sideHandleWidth);
    rectRightHandle.setAttribute("height", vbHeight);
    rectRightHandle.setAttribute("mask", "url(#" + maskId + ")");

    rectRightHandle.style.fillOpacity = 0;

    svg.appendChild(rectRightHandle);

    // right
    let rectRight = document.createElementNS(this.svgns, "rect");

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
        let dXMouse = e.pageX - lastMousePosX;

        if (dXMouse == 0) {
            return;
        }

        let pv = me.preview,
            dX = dXMouse / me.preview.svg.offsetWidth;

        lastMousePosX = e.pageX;

        if (dX > 0) {
            let tmlEToRender = pv.carrier.endToRender + dX;
            pv.carrier.beginToRender = tmlEToRender > 1 ? 1 : tmlEToRender;
        } else {
            let tmpBToRender = pv.carrier.beginToRender + dX;
            pv.carrier.beginToRender = tmpBToRender < 0 ? 0 : tmpBToRender;
        }
    };

    rerenderCener = function() {
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

        let maxs = me.getMaxs();
        mainChartG.setAttribute("transform", " scale(" + vbWidth / (endPos - startPos) + " " + (maxs.maxY / maxs.currMaxY) +") translate(" + -1 * mainVBW * (rectCenter.x.animVal.value + dX) / vbWidth + " " + (maxs.currMaxY - maxs.maxY) + ")");

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
            dX = dX > rectCenter.width.animVal.value ? rectCenter.width.animVal.value : dX;
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

        let maxs = me.getMaxs();
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
            dX = -1 * dX > rectCenter.width.animVal.value ? -1 * rectCenter.width.animVal.value : dX;
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

        let maxs = me.getMaxs();

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
};

Telecharm.prototype.drawAxis = function() {
    let svg = document.createElementNS(this.svgns, "svg"),
        vbWidth, vbHeight, N, maxY, Ys, Xs,
        me = this;

    Ys = this.getCurrentYs();
    N = Ys.length;
    maxY = this.dots.maxY;

    Xs = this.dots.Xs;

    vbHeight = this.mainChart.viewBox.height;
    vbWidth = this.mainChart.viewBox.width;

    svg.setAttribute("viewBox", [0, 0, vbWidth, vbHeight].join(" "));

    svg.style.width = this.mainChart.element.width;
    svg.style.height = this.mainChart.element.height;
    svg.style.display = "block";
    svg.style.position = "absolute";
    svg.style.top = 0;
    svg.style.left = 0;

    let style = document.createElementNS(this.svgns, "style");

    style.innerHTML = ".axis { font: normal 5px sans-serif; }";

    svg.appendChild(style);

    rerenderYAxis = function() {
        let { currMaxY: currVBHeight } = me.getMaxs(),
            Y = 0;

        dY = 2 * currVBHeight / 11;

        while (g.children.length) {
            g.children[0].remove();
        }

        g.setAttribute("transform", "scale(1 " + maxY/currVBHeight + ")");

        for (let i = 0; i < 6 ; i++) {
            let line = me.createLine([0, currVBHeight - Y, vbWidth, currVBHeight - Y], "#BBBBBB");

            line.style.strokeWidth = "0.5px";

            g.appendChild(line);

            let text = document.createElementNS(me.svgns, "text");

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
            let text = document.createElementNS(me.svgns, "text");
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

    let g = document.createElementNS(this.svgns, "g");
    let gX = document.createElementNS(this.svgns, "g");

    rerenderYAxis();
    rerenderXAxis();

    svg.appendChild(g);
    svg.appendChild(gX);

    this.container.appendChild(svg);
};

document.addEventListener("DOMContentLoaded", () => {
    charm = new Telecharm({
        width: 1000,
        height: 500,
        data: data[0],
        container: "chart"
    });
});
