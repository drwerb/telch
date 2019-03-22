var charm = null;

function Telecharm(params) {
    this.svgns = "http://www.w3.org/2000/svg";
    this.current = null;
    this.container = null;
    this.containerSvg = null;
    this.containerBtns = null;
    this.rerenderRequested = false;
    this.lastMousePosX = null;
    this.currentTheme = 'day';

    this.xAxisRule = {
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

    this.months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    this.mainChart = {
        viewBox: {
            width: 0,
            height: 0
        },
        element: {
            width: 0,
            height: 0
        },
        svg: null,
        chartG: {},
        chartsG: null
    };

    this.dots = {
        Xs: null,
        Ys: {},
        colors: {},
        count: {},
        dislayedCharts: new Set(),
        hiddenCharts: new Set(),
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
        svg: null,
        gYLines: null,
        gYText: null,
        gX: null,
        scaleY: 1
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
            begin: 0.6,
            end: 0.8,
            beginToRender: 0.6,
            endToRender: 0.8
        },
        svg: null,
        rects: {},
        fontSize: "8px",
        chartG: {},
        chartsG: null,
        chartBackG: {},
        chartsBackG: null
    };

    this.buttons = {};

    this.theme = {
        day: {
            axisColor: "#BBBBBBB"
        },
        night: {}
    };

    this.init(params);
}

Telecharm.prototype.init = function(params) {
    let mc = this.mainChart,
        pv = this.preview,
        ax = this.axis,
        container = document.getElementById(params.container),
        cW, cH,
        containerSvg = document.createElement("div"),
        containerBtns = document.createElement("div");

    container.appendChild(containerSvg);
    container.appendChild(containerBtns);

    this.container = container;
    this.containerSvg = containerSvg;
    this.containerBtns = containerBtns;

    containerSvg.style.width = "100%";
    containerSvg.style.height = (100 * 10 / 11) + "%";
    containerSvg.style.position = "absolute";
    containerSvg.style.top = 0;
    containerSvg.style.left = 0;
    containerSvg.style.overflow = "hidden";

    containerBtns.style.width = "100%";
    containerBtns.style.height = (100 * 1 / 11) + "%";
    containerBtns.style.position = "absolute";
    containerBtns.style.bottom = 0;
    containerBtns.style.left = 0;
    containerBtns.style.overflow = "hidden";

    cW = containerSvg.offsetWidth;
    cH = containerSvg.offsetHeight;

    mc.element.width = "100%";
    mc.element.height = (100 * 10 / 11) + "%";
    this.setXs(params.data.columns[0].slice(1).map(d => new Date(d)));
    for (let i = 1; i < params.data.columns.length; i++) {
        let Ys = params.data.columns[i],
            axisYName = Ys[0];
        this.setYs(axisYName, Ys.slice(1), params.data.colors[axisYName]);
    }
    mc.viewBox.height = this.dots.maxY;
    mc.viewBox.width = this.dots.maxY * cW / (10 * cH / 11);

    ax.element.width = mc.element.width;
    ax.element.height = mc.element.height;
    ax.viewBox.height = mc.viewBox.height;
    ax.viewBox.width = mc.viewBox.width;

    pv.element.width = "100%";
    pv.element.height = (100 * 1 / 11) + "%";
    pv.viewBox.height = this.dots.maxY;
    pv.viewBox.width = pv.viewBox.height * cW / (cH / 11);

    this.drawAxis();
    this.drawMainChart();
    this.drawPreviewChart();
    this.drawButtons();
};

Telecharm.prototype.getCurrThemeParam = function(param) {
    return this.theme[this.currentTheme][param];
}

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
        currMaxY = -Infinity;

    this.dots.dislayedCharts.forEach(name => {
        currMaxY = Math.max(currMaxY, ...this.dots.Ys[name].slice(dotsStart, dotsEnd));
    });

    return {
        maxY: this.dots.maxY,
        currMaxY
    };
};

Telecharm.prototype.requestRerender = function() {
    if (!this.rerenderRequested) {
        requestAnimationFrame(function() {
            this.rerenderSlider();
            this.rerenderRequested = false;
        }.bind(this));
        this.rerenderRequested = true;
    }
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

    let chartsG = this.mainChart.chartsG = document.createElementNS(this.svgns, "g");

    this.dots.dislayedCharts.forEach(name => {
        let groupName = "mainChart_" + name;
        this.current = name;

        this.mainChart.chartG[name] = this.drawChart(chartsG, {
            viewBoxHeight: mc.viewBox.height,
            viewBoxWidth: mc.viewBox.width,
            lineStrokeWidth: "3px",
            chartGroupId: groupName
        });
    });

    svg.appendChild(chartsG);

    this.containerSvg.appendChild(svg);
}

Telecharm.prototype.drawChart = function(parentEl, options) {
    let Ys = this.getCurrentYs(),
        N = Ys.length - 1,
        vbHeight = options.viewBoxHeight,
        dX = options.viewBoxWidth / (N - 1),
        X = 0,
        lineStroke = this.getCurrentColor(),
        lineStrokeWidth = options.lineStrokeWidth,
        chartG = document.createElementNS(this.svgns, "g");

    chartG.style.opacity = 1;

    let polyline = document.createElementNS(this.svgns, "polyline"),
        linePoints = "";

    polyline.setAttribute("vector-effect", "non-scaling-stroke");
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", lineStroke);
    polyline.setAttribute("stroke-width", lineStrokeWidth);

    for (i = 0; i < N; i++) {
        linePoints += X + "," + (vbHeight - Ys[i]) + " ";

        X += dX;
    }

    polyline.setAttribute("points", linePoints);
    chartG.appendChild(polyline);

    parentEl.appendChild(chartG);

    return chartG;
};

Telecharm.prototype.createLine = function(x1, y1, x2, y2, stroke) {

    return line;
};

Telecharm.prototype.drawPreviewChart = function() {
    let svg = document.createElementNS(this.svgns, "svg"),
        pv = this.preview, chartG;

    svg.setAttribute("viewBox", [0, 0, pv.viewBox.width, pv.viewBox.height].join(" "));

    this.preview.svg = svg;

    svg.style.width = pv.element.width;
    svg.style.height = pv.element.height;
    svg.style.display = "block";
    svg.style.position = "absolute";
    svg.style.bottom = 0;
    svg.style.left = 0;

    let background = document.createElementNS(this.svgns, "rect");

    background.setAttribute("x", "0");
    background.setAttribute("y", "0");
    background.setAttribute("width", pv.viewBox.width);
    background.setAttribute("height", pv.viewBox.height);


    let backMask = document.createElementNS(this.svgns, "mask");
    backMask.id = "previewBackground";

    background.style.fill = "white";
    background.style.fillOpacity = 0.5;

    backMask.appendChild(background.cloneNode());
    svg.appendChild(backMask);

    background.style.fill = "#BBBBBB";
    background.style.fillOpacity = 1;

    let g = document.createElementNS(this.svgns, "g");

    g.setAttribute("clip-path", "url(#backClip)");
    g.setAttribute("mask", "url(#previewBackground)");
    g.appendChild(background);
    // g.id = options.chartGroupId;

    let chartsBackG = this.preview.chartsBackG = document.createElementNS(this.svgns, "g");

    this.dots.dislayedCharts.forEach(name => {
        this.current = name;
        this.preview.chartBackG[name] = this.drawChart(chartsBackG, {
            viewBoxHeight: pv.viewBox.height,
            viewBoxWidth: pv.viewBox.width,
            lineStrokeWidth: "2px",
            mask: "previewBackground",
            chartGroupId: "previewChart",
            background: background.cloneNode(),
            clipId: "backClip",
            appendTo: chartG,
            chartId: "previewBack_" + name
        });
    });

    g.appendChild(chartsBackG);

    let frontBackgroundG = document.createElementNS(this.svgns, "g");

    let whiteBack = background.cloneNode();
    whiteBack.style.fill = "#FFFFFF";
    whiteBack.setAttribute("mask", "url(#carrierMask)")

    let grayBack = background.cloneNode();
    grayBack.style.fill = "#BBBBBB";

    frontBackgroundG.appendChild(grayBack);
    frontBackgroundG.appendChild(whiteBack);

    svg.appendChild(g);

    g = document.createElementNS(this.svgns, "g");

    g.setAttribute("clip-path", "url(#frontClip)");
    g.setAttribute("mask", "url(#sliderMask)");
    g.appendChild(frontBackgroundG);

    let chartsG = this.preview.chartsG = document.createElementNS(this.svgns, "g");

    chartG = null;
    this.dots.dislayedCharts.forEach(name => {
        this.current = name;
        this.preview.chartG[name] = this.drawChart(chartsG, {
            viewBoxHeight: pv.viewBox.height,
            viewBoxWidth: pv.viewBox.width,
            lineStrokeWidth: "2px",
            mask: "sliderMask",
            chartGroupId: "previewChart",
            background: frontBackgroundG,
            clipId: "frontClip",
            appendTo: chartG,
            chartId: "previewFront_" + name
        });
    });

    g.appendChild(chartsG);

    svg.appendChild(g);

    this.drawPreviewSlider();

    this.containerSvg.appendChild(svg);
};

Telecharm.prototype.normalizedWidth = function(w) {
    return w < 0 ? 0 : w;
};

Telecharm.prototype.rerenderSlider = function() {
    let pv = this.preview,
        diffBegin = pv.carrier.beginToRender - pv.carrier.begin,
        diffEnd = pv.carrier.endToRender - pv.carrier.end,
        dXBegin = pv.viewBox.width * diffBegin,
        dXEnd = pv.viewBox.width * diffEnd,
        vbWidth = this.mainChart.viewBox.width,
        tmpWidth,
        {
            clipRect,
            carrierMaskRect,
            handlerRect
        } = this.preview.rects;

    if (diffBegin != 0 && diffEnd != 0) {
        clipRect.setAttribute("x", clipRect.x.animVal.value + dXBegin);
        carrierMaskRect.setAttribute("x", carrierMaskRect.x.animVal.value + dXBegin);
        handlerRect.setAttribute("x", handlerRect.x.animVal.value + dXBegin);
    } else if (diffBegin != 0 && diffEnd == 0) {
        clipRect.setAttribute("x", clipRect.x.animVal.value + dXBegin);
        carrierMaskRect.setAttribute("x", carrierMaskRect.x.animVal.value + dXBegin);
        handlerRect.setAttribute("x", handlerRect.x.animVal.value + dXBegin);

        clipRect.setAttribute("width", clipRect.width.animVal.value - dXBegin);
        carrierMaskRect.setAttribute("width", carrierMaskRect.width.animVal.value - dXBegin);
        handlerRect.setAttribute("width", handlerRect.width.animVal.value - dXBegin);
    } else if (diffBegin == 0 && diffEnd != 0) {
        clipRect.setAttribute("width", clipRect.width.animVal.value + dXEnd);
        carrierMaskRect.setAttribute("width", carrierMaskRect.width.animVal.value + dXEnd);
        handlerRect.setAttribute("width", handlerRect.width.animVal.value + dXEnd);
    }

    // if (diffBegin != 0 || diffEnd != 0) {
    //     let maxs = this.getMaxs();
    //     this.mainChart.mainChartG.setAttribute("transform", " scale(" + 1 / (pv.carrier.end - pv.carrier.begin) + " " + (maxs.maxY / maxs.currMaxY) +") translate(" + -1 * vbWidth * pv.carrier.begin + " " + (maxs.currMaxY - maxs.maxY) + ")");
    // }

    this.rerenderXAxis();
    // this.rerenderYAxis();
    // this.animateYAxis();

    pv.carrier.begin = pv.carrier.beginToRender;
    pv.carrier.end = pv.carrier.endToRender;
};

Telecharm.prototype.mouseMoveHandler = function(e) {
    let dXMouse = e.pageX - this.lastMousePosX;

    e.preventDefault();
    e.stopPropagation();

    if (dXMouse == 0) {
        return;
    }

    this.lastMousePosX = e.pageX;

    let pv = this.preview,
        dX = dXMouse / this.preview.svg.width.animVal.value;

    lastMousePosX = e.pageX;

    let tmlEToRender, tmpBToRender;

    if (dX > 0) {
        tmlEToRender = pv.carrier.endToRender + dX;
        pv.carrier.endToRender = tmlEToRender > 1 ? 1 : tmlEToRender;
        pv.carrier.beginToRender += pv.carrier.endToRender - pv.carrier.end;
    } else {
        tmpBToRender = pv.carrier.beginToRender + dX;
        pv.carrier.beginToRender = tmpBToRender < 0 ? 0 : tmpBToRender;
        pv.carrier.endToRender += pv.carrier.beginToRender - pv.carrier.begin;
    }

    this.requestRerender();
};

Telecharm.prototype.leftHandlerDrag = function(e) {
    let dXMouse = e.pageX - this.lastMousePosX;

    e.preventDefault();
    e.stopPropagation();

    if (dXMouse == 0) {
        return;
    }

    this.lastMousePosX = e.pageX;

    let pv = this.preview,
        dX = dXMouse / this.preview.svg.width.animVal.value;

    lastMousePosX = e.pageX;

    let tmpBToRender = pv.carrier.beginToRender + dX;

    if (dX > 0) {
        pv.carrier.beginToRender = tmpBToRender >= pv.carrier.end ? pv.carrier.end : tmpBToRender;
    } else {
        pv.carrier.beginToRender = tmpBToRender < 0 ? 0 : tmpBToRender;
    }

    this.requestRerender();
};

Telecharm.prototype.rightHandlerDrag = function(e) {
    let dXMouse = e.pageX - this.lastMousePosX;

    e.preventDefault();
    e.stopPropagation();

    if (dXMouse == 0) {
        return;
    }

    this.lastMousePosX = e.pageX;

    let pv = this.preview,
        dX = dXMouse / this.preview.svg.width.animVal.value;

    lastMousePosX = e.pageX;

    let tmpEToRender = pv.carrier.endToRender + dX;

    if (dX > 0) {
        pv.carrier.endToRender = tmpEToRender > 1 ? 1 : tmpEToRender;
    } else {
        pv.carrier.endToRender = tmpEToRender < pv.carrier.begin ? pv.carrier.begin : tmpEToRender;
    }

    this.requestRerender();
};

Telecharm.prototype.bindHandler = function() {
    return function(e) {
        var { maxY, currMaxY } = this.getMaxs(),
            gT = this.axis.gYText,
            gL = this.axis.gYLines,
            scaleY = this.axis.scaleY,
            pv = this.preview,
            prevScaleX = 1 / (pv.carrier.end - pv.carrier.begin),
            prevScaleY = maxY / currMaxY,
            vbWidth = this.mainChart.viewBox.width,
            prevTranslateX = -1 * vbWidth * pv.carrier.begin,
            prevTranslateY = currMaxY - maxY;

        this.lastMousePosX = e.pageX;

        let pos = e.offsetX * this.preview.viewBox.width / this.containerSvg.offsetWidth,
            rect = this.preview.rects.carrierMaskRect;

        if (pos <= rect.x.animVal.value) {
            document.onmousemove = this.leftHandlerDrag.bind(this);
        } else if (pos >= rect.x.animVal.value + rect.width.animVal.value) {
            document.onmousemove = this.rightHandlerDrag.bind(this);
        } else {
            document.onmousemove = this.mouseMoveHandler.bind(this);
        }

        document.onmouseup = function() {
            this.animateYAxis({
                prevMaxY: currMaxY,
                prevScaleX,
                prevScaleY,
                prevTranslateX,
                prevTranslateY
            });
            document.onmousemove = null;
            document.onmouseup = null;
        }.bind(this);
    }.bind(this)
};

Telecharm.prototype.drawPreviewSlider = function() {
    let pv = this.preview,
        vbHeight = pv.viewBox.height,
        vbWidth = pv.viewBox.width,
        startPos = vbWidth * pv.carrier.begin,
        endPos = vbWidth * pv.carrier.end,
        sidesOpacity = 0.4,
        maskId = "sliderMask",
        width = this.containerSvg.offsetWidth,
        koef = vbWidth / width,
        mainChartSvg = this.mainChart.svg,
        sideHandleWidth = 10 * koef,
        edgeHeight = 5 * koef,
        svg = this.preview.svg;

    let carrierClip = document.createElementNS(this.svgns, "clipPath");
    carrierClip.id = "frontClip";

    let clipRect = document.createElementNS(this.svgns, "rect");

    clipRect.setAttribute("x", startPos);
    clipRect.setAttribute("y", "0");
    clipRect.setAttribute("width", endPos - startPos);
    clipRect.setAttribute("height", vbHeight);

    carrierClip.appendChild(clipRect);

    svg.appendChild(carrierClip);

    let handlerRect = clipRect.cloneNode();
    handlerRect.style.fillOpacity = 0;

    svg.appendChild(handlerRect);

    let mask = document.createElementNS(this.svgns, "mask");

    mask.id = "carrierMask";

    let carrierMaskRect = document.createElementNS(this.svgns, "rect");

    carrierMaskRect.setAttribute("x", startPos + 1 + sideHandleWidth);
    carrierMaskRect.setAttribute("y", edgeHeight);
    carrierMaskRect.setAttribute("width", endPos - startPos - 2 * sideHandleWidth);
    carrierMaskRect.setAttribute("height", vbHeight - 2 * edgeHeight);

    carrierMaskRect.style.fill = "white";
    carrierMaskRect.style.fillOpacity = 1;

    mask.appendChild(carrierMaskRect);

    svg.appendChild(mask);

    this.preview.rects = {
        clipRect,
        carrierMaskRect,
        handlerRect
    };

    handlerRect.onmousedown = this.bindHandler();
};

Telecharm.prototype.getXs = function() {
    let Xs = this.dots.Xs
        len = Xs.length,
        dotsStart = Math.floor(len * this.preview.carrier.beginToRender),
        dotsEnd = Math.round(len * this.preview.carrier.endToRender);

    return {
        viewXs: Xs.slice(dotsStart, dotsEnd)
    };
};

Telecharm.prototype.rerenderYAxis = function(scY) {
    let { maxY, currMaxY: currVBHeight } = this.getMaxs(),
        Y = 0,
        dY = 2 * currVBHeight / 11,
        gL = this.axis.gYLines = document.createElementNS(this.svgns, "g"),
        gT = this.axis.gYText = document.createElementNS(this.svgns, "g"),
        scaleY = scY ? scY : maxY/currVBHeight;

    this.axis.scaleY = scaleY;

    for (let i = 0; i < 6 ; i++) {
        let line = document.createElementNS(this.svgns, "line");

        line.setAttribute("x1", 0);
        line.setAttribute("y1", currVBHeight - Y);
        line.setAttribute("x2", this.mainChart.viewBox.width);
        line.setAttribute("y2", currVBHeight - Y);

        line.style.stroke = "#BBBBBB";

        line.style.strokeWidth = "0.5px";
        line.setAttribute("vector-effect", "non-scaling-stroke");

        gL.appendChild(line);

        let text = document.createElementNS(this.svgns, "text");

        text.setAttribute("class", "axis");
        text.setAttribute("x", 0);
        text.setAttribute("y", (currVBHeight - Y - 5) * scaleY);
        text.setAttribute("fill", "#777777");
        text.setAttribute("vector-effect", "non-scaling-stroke");

        text.innerHTML = Math.round(Y);

        gT.appendChild(text);

        Y += dY;
    }

    this.axis.svg.appendChild(this.axis.gYLines);
    this.axis.svg.appendChild(this.axis.gYText);
};

Telecharm.prototype.fadeOutYAxis = function(opts) {
    let { maxY, currMaxY: currVBHeight } = this.getMaxs(),
        Y = 0,
        dY = 2 * currVBHeight / 11,
        gTOld = opts.gTOld,
        gLOld = opts.gLOld,
        lenOld = gTOld.children.length,
        gT = this.axis.gYText,
        gL = this.axis.gYLines,
        len = gT.children.length,
        progress = opts.progress,
        targetScale = opts.prevMaxY / currVBHeight ,
        scaleY = 1 + (targetScale - 1) * progress,
        scaleY2 = scaleY / targetScale;

    gLOld.setAttribute("transform", "translate(0 " + maxY * (1 - scaleY) + ") scale(1 " + scaleY + ")");
    gLOld.style.opacity = 1 - progress;

    for (let i = 0; i < len; i++) {
        let c = gTOld.children[i];
        c.setAttribute("y", c.y.animVal[0].value * scaleY / opts.prevScale);
    }

    gTOld.setAttribute("transform", "translate(0 " + maxY * (1 - scaleY) + ")");
    gTOld.style.opacity = 1 - progress;

    gL.setAttribute("transform", "translate(0 " + maxY * (1 - scaleY2) + ") scale(1 " + scaleY2 + ")");
    gL.style.opacity = progress;

    for (let i = 0; i < len; i++) {
        let c = gT.children[i];
        c.setAttribute("y", c.y.animVal[0].value * scaleY2 / opts.prevScale2);
    }

    gT.setAttribute("transform", "translate(0 " + maxY * (1 - scaleY2) + ")");
    gT.style.opacity = progress;

    opts.prevScale = scaleY;
    opts.prevScale2 = scaleY2;

    return opts;
};

Telecharm.prototype.smoothlyUpdateChart = function(opts) {
    let {
            progress,
            maxs,
            prevScaleX,
            prevScaleY,
            prevTranslateX,
            prevTranslateY
        } = opts,
        pv = this.preview,
        targetScaleX = 1 / (pv.carrier.end - pv.carrier.begin),
        targetScaleY = (maxs.maxY / maxs.currMaxY),
        vbWidth = this.mainChart.viewBox.width,
        targetTranslateX = -1 * vbWidth * pv.carrier.begin,
        targetTranslateY = maxs.currMaxY - maxs.maxY,
        currentScaleX = prevScaleX + (targetScaleX - prevScaleX) * progress,
        currentScaleY = prevScaleY + (targetScaleY - prevScaleY) * progress,
        currentTranslateX = prevTranslateX + (targetTranslateX - prevTranslateX) * progress,
        currentTranslateY = (prevTranslateY + (targetTranslateY - prevTranslateY) * progress) * ( targetScaleY > prevScaleY ? targetScaleY : prevScaleY) / currentScaleY;

    this.mainChart.chartsG.setAttribute("transform", " scale(" + currentScaleX + " " + currentScaleY +") translate(" + currentTranslateX + " " + currentTranslateY  + ")");
};

Telecharm.prototype.smoothlyUpdatePreview = function(opts) {
    let {
            progress,
            maxs,
            prevScaleX,
            prevScaleY,
            prevTranslateX,
            prevTranslateY
        } = opts,
        previewChanged = false,
        pv = this.preview,
        targetScaleX = 1 / (pv.carrier.end - pv.carrier.begin),
        targetScaleY = (maxs.maxY / maxs.currMaxY),
        vbWidth = this.mainChart.viewBox.width,
        targetTranslateX = -1 * vbWidth * pv.carrier.begin,
        targetTranslateY = maxs.currMaxY - maxs.maxY,
        currentScaleX = prevScaleX + (targetScaleX - prevScaleX) * progress,
        currentScaleY = prevScaleY + (targetScaleY - prevScaleY) * progress,
        currentTranslateX = prevTranslateX + (targetTranslateX - prevTranslateX) * progress,
        currentTranslateY = (prevTranslateY + (targetTranslateY - prevTranslateY) * progress) * ( targetScaleY > prevScaleY ? targetScaleY : prevScaleY) / currentScaleY;

    this.dots.dislayedCharts.forEach(name => {
        if (this.mainChart.chartG[name].style.opacity < 1) {
            this.mainChart.chartG[name].style.opacity = progress;
            this.preview.chartG[name].style.opacity = progress;
            this.preview.chartBackG[name].style.opacity = progress;
            previewChanged = true;
        }
    });

    this.dots.hiddenCharts.forEach(name => {
        if (this.mainChart.chartG[name].style.opacity > 0) {
            this.mainChart.chartG[name].style.opacity = 1 - progress;
            this.preview.chartG[name].style.opacity = 1 - progress;
            this.preview.chartBackG[name].style.opacity = 1 - progress;
            previewChanged = true;
        }
    });

    if (previewChanged) {
        this.preview.chartsG.setAttribute("transform", " scale(1 " + currentScaleY +") translate(0 " + currentTranslateY  + ")");
        this.preview.chartsBackG.setAttribute("transform", " scale(1 " + currentScaleY +") translate(0 " + currentTranslateY  + ")");
    }
};

Telecharm.prototype.animateYAxis = function(opts) {
    var maxs = this.getMaxs(),
        gL = this.axis.gYLines,
        gT = this.axis.gYText,
        Y = 0,
        dY = 2 * maxs.currMaxY / 11,
        len = gT.children.length,
        {
            prevMaxY,
            prevScaleX,
            prevScaleY,
            prevTranslateX,
            prevTranslateY
        } = opts;

    this.axis.gYLines = gL.cloneNode(true);
    this.axis.gYText = gT.cloneNode(true);

    for (let i = 0; i < len ; i++) {
        this.axis.gYText.children[i].innerHTML = Math.round(Y);

        Y += dY;
    }

    this.axis.svg.appendChild(this.axis.gYLines);
    this.axis.svg.appendChild(this.axis.gYText);


    var animF = function(opts) {
        requestAnimationFrame(function(timestamp) {
            let progress = (timestamp - opts.start) / opts.duration;

            opts.progress = progress > 1 ? 1 : progress;
            opts = this.fadeOutYAxis(opts);
            this.smoothlyUpdateChart(opts);
            this.smoothlyUpdatePreview(opts);

            if (progress < 1) {
                animF(opts);
            } else {
                opts.gLOld.remove();
                opts.gTOld.remove();
            }
        }.bind(this))
    }.bind(this);

    animF({
        start: performance.now(),
        duration: 300,
        startScale: 1,
        prevScale: 1,
        prevScale2: 1,
        targetScale: this.mainChart.viewBox.height/prevMaxY,
        gLOld: gL,
        gTOld: gT,
        prevMaxY: prevMaxY,
        maxs: maxs,
        prevScaleX,
        prevScaleY,
        prevTranslateX,
        prevTranslateY
    });
};

Telecharm.prototype.rerenderXAxis = function() {
    var { viewXs } = this.getXs(),
        len = viewXs.length,
        segDotsLen, X = 0, dX, segments, startDotX,
        vbWidth = this.mainChart.viewBox.width,
        gX = this.axis.gX;

    if (len < 15) {
        segments = this.xAxisRule[len];
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
        let text = document.createElementNS(this.svgns, "text");
        let date = viewXs[i];

        text.setAttribute("class", "axis");
        text.setAttribute("x", X);
        text.setAttribute("y", this.mainChart.viewBox.height - 10);
        text.setAttribute("fill", "#777777");

        text.innerHTML = date.getDate() + " " + this.months[date.getMonth()];

        gX.appendChild(text);

        X += dX;
    }
};

Telecharm.prototype.drawAxis = function() {
    let svg = this.axis.svg = document.createElementNS(this.svgns, "svg"),
        vbWidth, vbHeight, N, maxY, Ys, Xs;

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

    style.innerHTML = ".axis { font: normal " + this.preview.fontSize + " sans-serif; }";

    svg.appendChild(style);

    this.axis.gX = document.createElementNS(this.svgns, "g");

    this.rerenderYAxis();
    this.rerenderXAxis();

    svg.appendChild(this.axis.gX);

    this.containerSvg.appendChild(svg);
};

Telecharm.prototype.drawButtons = function() {
    let buttonStyle = document.createElement("style");

    buttonStyle.innerHTML = `
        .button {
            position: relative;
            display: inline-block;
            margin:10px;
            padding:6px;
            border-color:gray;
            border-radius: 24px;
            border-width: 1px;
            border-style: solid;
        }

        .button-text {
            display: inline-block;
            position: relative;
            left: 0;
        }

        .button-icon-selected {
            left: 0;
            width: 24px;
            height: 24px;
            margin: 1px 10px 0px;
            border-radius: 15px;
            display:none;
            border-radius: 15px;
            border-style: solid;
            border-width: 2px;
        }

        .button-icon-unselected {
            left: 0;
            display: inline-block;
            width: 24px;
            height: 24px;
            margin: 1px 10px 0px;
            border-radius: 15px;
            border-style: solid;
            border-width: 2px;
        }

        .button.selected .button-icon-selected {
            display: inline-block;
        }

        .button.selected .button-icon-unselected {
            display: none;
        }
    `;

    document.head.appendChild(buttonStyle);

    Object.keys(this.dots.Ys).forEach(name => {
        this.current = name;
        let btn = document.createElement("div"),
            color = this.getCurrentColor();

        btn.innerHTML = `<div class="button-icon-selected" style="background-color:${color};border-color:${color};"></div><div class="button-icon-unselected" style="border-color:${color};"></div><div class="button-text">${name}</div>`;
        btn.setAttribute("class", "button selected");
        btn.onclick = this.bindButtonHandler(btn, name);
        this.containerBtns.appendChild(btn);
    });
}

Telecharm.prototype.bindButtonHandler = function(btn, name) {
    return function(e) {
        e.stopPropagation();
        e.preventDefault();
        btn.classList.toggle("selected");

        var { maxY, currMaxY } = this.getMaxs(),
            gT = this.axis.gYText,
            gL = this.axis.gYLines,
            scaleY = this.axis.scaleY,
            pv = this.preview,
            prevScaleX = 1 / (pv.carrier.end - pv.carrier.begin),
            prevScaleY = maxY / currMaxY,
            vbWidth = this.mainChart.viewBox.width,
            prevTranslateX = -1 * vbWidth * pv.carrier.begin,
            prevTranslateY = currMaxY - maxY;

        if (this.dots.dislayedCharts.has(name)) {
            this.dots.dislayedCharts.delete(name);
            this.dots.hiddenCharts.add(name);
        } else {
            this.dots.dislayedCharts.add(name);
            this.dots.hiddenCharts.delete(name);
        }

        this.animateYAxis({
            prevMaxY: currMaxY,
            prevScaleX,
            prevScaleY,
            prevTranslateX,
            prevTranslateY
        });
    }.bind(this);
};

document.addEventListener("DOMContentLoaded", () => {
    charm = new Telecharm({
        width: 1000,
        height: 500,
        data: data[0],
        container: "chart"
    });
});
