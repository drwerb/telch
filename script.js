var charm = null;

function Telecharm(params) {
    this.svgns = "http://www.w3.org/2000/svg";
    this.current = null;
    this.container = null;
    this.containerSvg = null;
    this.containerBtns = null;
    this.isViewUpdateRequested = false;
    this.lastMousePosX = null;
    this.currentTheme = 'day';
    this.animDuration = 300;
    this.dragProcessing = false;
    this.lastState = {};
    this.currentState = {};
    this.vertAnimState = {};
    this.horizAnimState = {};
    this.animationState = {
        horizScaleProgress: 1,
        vertScaleProgress: 1,
        vertScaleStartTime: 1,
        progress: 0,
        carrierBeginFrom: 0,
        carrierEndFrom: 1,
        carrierBeginTo: 0,
        carrierEndTo: 1
    };

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
        displayedCharts: new Set(),
        hiddenCharts: new Set(),
        maxY: -Infinity,
        maxsY: {}
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
        fontSize: "11px",
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

    this.currentStateSnapshot(this.currentState);

    this.drawAxis();
    this.drawMainChart();
    this.drawPreviewChart();
    this.drawButtons();

    this.currentStateSnapshot(this.lastState);
    this.requestViewUpdate();
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
    this.dots.displayedCharts.add(name);
    this.current = name;

    this.setMaxY(Ys, name);
};

Telecharm.prototype.getCurrentYs = function() {
    return this.dots.Ys[this.current];
};

Telecharm.prototype.getCurrentColor = function() {
    return this.dots.colors[this.current];
};

Telecharm.prototype.setMaxY = function(Ys, name) {
    this.dots.maxsY[name] = Math.max(...Ys);
    this.dots.maxY = Math.max(this.dots.maxY, this.dots.maxsY[name]);
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

    this.dots.displayedCharts.forEach(name => {
        currMaxY = Math.max(currMaxY, ...this.dots.Ys[name].slice(dotsStart, dotsEnd));
    });

    return {
        maxY: this.dots.maxY,
        currMaxY
    };
};

Telecharm.prototype.getDisplayedMaxY = function() {
    let max = -Infinity;

    this.dots.displayedCharts.forEach(name => { max = Math.max(max, this.dots.maxsY[name])});

    return max;
};

Telecharm.prototype.requestViewUpdate = function() {
    if (!this.isViewUpdateRequested) {
        this.animate();
        this.isViewUpdateRequested = true;
    }
};

Telecharm.prototype.animate = function() {
    requestAnimationFrame(function(timestamp) {
        let as = this.animationState,
            cs = this.currentState,
            ls = this.lastState,
            vas = this.vertAnimState,
            has = this.horizAnimState,
            pv = this.preview;

        this.currentStateSnapshot(cs);

        if (as.vertScaleProgress == 1) {
            as.vertScaleProgress = 0;
            this.copyStateSnapshot(ls, vas);
            vas.time = timestamp;
            this.createRenewedYAxis();
        }

        if (as.vertScaleProgress < 1) {
            let progress = (timestamp - vas.time) / 300;
            as.vertScaleProgress = progress < 0 ? 0 : progress > 1 ? 1 : progress;
        }

        if (!this.dragProcessing && (as.afterLeftDragUpdate || as.afterRightDragUpdate)) {
            this.createRenewedXAxis();
            this.copyStateSnapshot(cs, has);
            as.horizScaleProgress = 0;
        }

        this.updateSlider();
        this.updateXAxis();

        pv.carrier.begin = pv.carrier.beginToRender;
        pv.carrier.end = pv.carrier.endToRender;

        as.progress = 1;

        if (as.vertScaleProgress <= 1 && as.oldGYLines) {
            this.updateYAxis();
            if (as.vertScaleProgress == 1) {
                as.oldGYLines.remove();
                as.oldGYText.remove();
                as.oldGYLines = null;
                as.oldGYText = null;
            }
        }

        this.smoothlyUpdateChart();
        this.smoothlyUpdatePreview();

        if (as.progress == 1 && this.dragProcessing) {
            this.currentStateSnapshot(ls);
        }

        if (as.horizScaleProgress < 1) {
            let progress = (timestamp - has.time) / 300;
            as.horizScaleProgress = progress < 0 ? 0 : progress > 1 ? 1 : progress;
        }

        if (as.horizScaleProgress == 1 && as.oldGXText) {
            as.oldGXText.remove();
            as.oldGXText = null;
        }

        if (!this.dragProcessing && as.progress == 1 && as.vertScaleProgress == 1 && as.horizScaleProgress == 1) {
            this.isViewUpdateRequested = false;
        } else {
            this.animate();
        }
    }.bind(this));
};

Telecharm.prototype.createRenewedXAxis = function() {
    let Xs = this.dots.Xs,
        lenXs = Xs.length,
        btr = this.preview.carrier.beginToRender,
        etr = this.preview.carrier.endToRender,
        dotsStart = Math.floor(lenXs * this.preview.carrier.beginToRender),
        dotsEnd = Math.round(lenXs * this.preview.carrier.endToRender),
        len = dotsEnd - dotsStart,
        X = 0, segments, startDotX,
        vbWidth = this.containerSvg.offsetWidth,
        gX = this.axis.gX,
        segDotsLen = +gX.dataset.seglen,
        dX = +gX.dataset.dx,
        tr = +gX.dataset.trx;
        newGX = gX.cloneNode();

    var lenT = gX.children.length,
        as = this.animationState;

    as.oldGXText = gX;

    this.axis.gX = newGX;

    if (as.afterLeftDragUpdate) {
        let lc = gX.lastChild;
        while (+lc.dataset.x + tr > vbWidth) {
            lc.remove();
            lc = gX.lastChild;
        }
        newGX.appendChild(lc.cloneNode(true));
        while ((+newGX.firstChild.dataset.idx - segDotsLen) / lenXs >= btr) {
            let nextIdx = +newGX.firstChild.dataset.idx - segDotsLen,
                X = +newGX.firstChild.dataset.x - dX;

            if (nextIdx < 0) {
                break;
            }

            let text = this.createXAxisText(Xs[nextIdx], X);
            text.setAttribute("data-x", X);
            text.setAttribute("data-idx", nextIdx);
            newGX.insertBefore(text, newGX.firstChild);
        }
        as.afterLeftDragUpdate = false;
    }

    if (as.afterRightDragUpdate) {
        let fc = gX.firstChild;
        while (+fc.dataset.x + tr < 0) {
            fc.remove();
            fc = gX.firstChild;
        }
        newGX.appendChild(fc.cloneNode(true));
        while ((+newGX.lastChild.dataset.idx + segDotsLen) / lenXs <= etr) {
            let nextIdx = +newGX.lastChild.dataset.idx + segDotsLen,
                X = +newGX.lastChild.dataset.x + dX;

            if (nextIdx < lenXs) {
                break;
            }

            let text = this.createXAxisText(Xs[nextIdx], X);
            text.setAttribute("data-x", X);
            text.setAttribute("data-idx", nextIdx);
            newGX.appendChild(text);
        }
        as.afterRightDragUpdate = false;
    }

    this.axis.svgTextX.appendChild(newGX);
}

Telecharm.prototype.updateXAxis = function() {
    let Xs = this.dots.Xs,
        lenXs = Xs.length,
        b = this.preview.carrier.begin,
        e = this.preview.carrier.end,
        btr = this.preview.carrier.beginToRender,
        etr = this.preview.carrier.endToRender,
        dotsStart = Math.floor(lenXs * btr),
        dotsEnd = Math.round(lenXs * etr),
        scaleX = this.currentState.scaleX,
        translateX = this.currentState.translateX,
        len = dotsEnd - dotsStart,
        vbWidth = this.containerSvg.offsetWidth,
        gX = this.axis.gX,
        segDotsLen = +gX.dataset.seglen,
        dX = +gX.dataset.dx,
        tr = +gX.dataset.trx,
        sc = +gX.dataset.scx,
        X = 0, segments, startDotX,
        pv = this.preview,
        targetScaleX = 1 / (etr - btr),
        targetTranslateX = -1 * this.mainChart.viewBox.width * pv.carrier.beginToRender,
        idxLen = this.mainChart.viewBox.width / lenXs;

    let progress = this.animationState.progress,
        cs = this.currentState,
        ls = this.lastState,
        vas = this.vertAnimState,
        prevScaleX = ls.scaleX,
        prevTranslateX = ls.translateX,
        textXScale = vbWidth / this.mainChart.viewBox.width,
        currentScaleX = prevScaleX + (scaleX - prevScaleX) * progress,
        currentTranslateX = tr + ((targetTranslateX - translateX) * currentScaleX) * textXScale,
        // currentTranslateX = tr - (btr - pv.carrier.begin) * vbWidth,
        leftEdge = (vbWidth * btr + targetTranslateX) * sc,
        rightEdge = (vbWidth * etr + targetTranslateX) * sc,
        leftNewTextX = (+gX.firstChild.dataset.x - dX),
        rightNewTextX = (+gX.lastChild.dataset.x + dX),
        as = this.animationState,
        progressH = as.horizScaleProgress;
        // currentTranslateY = (prevTranslateY * prevScaleY + (targetTranslateY * targetScaleY - prevTranslateY * prevScaleY) * progressV) / (prevScaleY + (targetScaleY - prevScaleY) * progressV);

    if (as.oldGXText) {
        as.oldGXText.style.opacity = 1 - progressH;
        gX.style.opacity = progressH;
    }


    if (btr != b && etr != e) {
        if ((+gX.firstChild.dataset.idx - segDotsLen) / lenXs >= btr) {
            let movedText = gX.lastChild,
                nextIdx = +gX.firstChild.dataset.idx - segDotsLen;

            if (nextIdx > 0) {
                movedText.innerHTML = this.getDateText(Xs[nextIdx]);
                movedText.setAttribute("x", leftNewTextX);
                movedText.dataset.x = +gX.firstChild.dataset.x - dX;
                movedText.dataset.idx = nextIdx;
                gX.insertBefore(movedText, gX.firstChild);
            }
        } else if ((+gX.lastChild.dataset.idx + segDotsLen) / lenXs <= etr) {
            let movedText = gX.firstChild,
                nextIdx = +gX.lastChild.dataset.idx + segDotsLen;

            if (nextIdx < lenXs) {
                movedText.innerHTML = this.getDateText(Xs[nextIdx]);
                movedText.setAttribute("x", rightNewTextX);
                movedText.dataset.x = +gX.lastChild.dataset.x + dX;
                movedText.dataset.idx = nextIdx;
                gX.appendChild(movedText);
            }
        }

        this.axis.gX.setAttribute("transform", "translate(" + currentTranslateX + " 0)");
        gX.dataset.trx = currentTranslateX;
    }
    else if (btr != b && etr == e || btr == b && etr != e){
        let chLen = gX.children.length;

        for (let i = 0; i < chLen; i++) {
            let ch = gX.children[i],
                idx = +ch.dataset.idx,
                chartX = (idx - 1) * idxLen,
                ddX = (chartX + targetTranslateX) * targetScaleX - (chartX + translateX) * scaleX,
                newX = ch.x.animVal[0].value + ddX * textXScale;

            ch.setAttribute("x", newX);
            ch.dataset.x = newX;
        }

        if (len < 15) {
            segments = this.xAxisRule[len];
        } else {
            segments = len % 6 < len % 5 ? 6 : 5;
        }

        segDotsLen = Math.floor(len / segments);

        dX = segDotsLen * vbWidth / len;

        gX.setAttribute("data-dx", dX);
        gX.setAttribute("data-seglen", segDotsLen);

        if ((+gX.firstChild.dataset.idx - segDotsLen) / lenXs >= btr) {
            let nextIdx = +gX.firstChild.dataset.idx - segDotsLen,
                X = +gX.firstChild.dataset.x - dX;

            if (nextIdx > 0) {
                let text = this.createXAxisText(Xs[nextIdx], X);
                text.setAttribute("data-x", X);
                text.setAttribute("data-idx", nextIdx);
                gX.insertBefore(text, gX.firstChild);
                this.animationState.afterLeftDragUpdate = true;
            }

        } else if ((+gX.lastChild.dataset.idx + segDotsLen) / lenXs <= etr) {
            let nextIdx = +gX.lastChild.dataset.idx + segDotsLen,
                X = +gX.lastChild.dataset.x + dX;

            if (nextIdx < lenXs) {
                let text = this.createXAxisText(Xs[nextIdx], X);
                text.setAttribute("data-x", X);
                text.setAttribute("data-idx", nextIdx);
                gX.appendChild(text);
                this.animationState.afterRightDragUpdate = true;
            }
        }
    }
};

Telecharm.prototype.createRenewedYAxis = function() {
    var gL = this.axis.gYLines,
        gT = this.axis.gYText,
        Y = 0,
        dY = 2 * this.currentState.localMaxY / 11,
        len = gT.children.length,
        as = this.animationState;

    as.oldGYLines = gL;
    as.oldGYText = gT;
    as.prevScale = 1;
    as.prevScale2 = 1;

    this.axis.gYLines = gL.cloneNode(true);
    this.axis.gYText = gT.cloneNode(true);

    for (let i = 0; i < len ; i++) {
        this.axis.gYText.children[i].innerHTML = Math.round(Y);

        Y += dY;
    }

    this.axis.svg.appendChild(this.axis.gYLines);
    this.axis.svgTextY.appendChild(this.axis.gYText);
}

Telecharm.prototype.updateYAxis = function() {
    let cs = this.currentState,
        ls = this.lastState,
        vas = this.vertAnimState,
        as = this.animationState,
        progressV = as.vertScaleProgress,
        maxY = cs.maxY,
        currMaxY = cs.localMaxY,
        Y = 0,
        dY = 2 * currMaxY / 11,
        gTOld = as.oldGYText,
        gLOld = as.oldGYLines,
        lenOld = gTOld.children.length,
        gT = this.axis.gYText,
        gL = this.axis.gYLines,
        len = gT.children.length,
        targetScale = vas.localMaxY / currMaxY,
        scaleY = 1 + (targetScale - 1) * progressV,
        scaleY2 = scaleY / targetScale;

    gLOld.setAttribute("transform", "translate(0 " + maxY * (1 - scaleY) + ") scale(1 " + scaleY + ")");
    gLOld.style.opacity = 1 - progressV;

    for (let i = 0; i < len; i++) {
        let c = gTOld.children[i];
        c.setAttribute("y", c.y.animVal[0].value * scaleY / as.prevScale);
    }

    gTOld.setAttribute("transform", "translate(0 " + maxY * (1 - scaleY) + ")");
    gTOld.style.opacity = 1 - progressV;

    gL.setAttribute("transform", "translate(0 " + maxY * (1 - scaleY2) + ") scale(1 " + scaleY2 + ")");
    gL.style.opacity = progressV;

    for (let i = 0; i < len; i++) {
        let c = gT.children[i];
        c.setAttribute("y", c.y.animVal[0].value * scaleY2 / as.prevScale2);
    }

    gT.setAttribute("transform", "translate(0 " + maxY * (1 - scaleY2) + ")");
    gT.style.opacity = progressV;

    as.prevScale = scaleY;
    as.prevScale2 = scaleY2;
};

Telecharm.prototype.smoothlyUpdateChart = function() {
    let progress = this.animationState.progress,
        progressV = this.animationState.vertScaleProgress,
        cs = this.currentState,
        ls = this.lastState,
        vas = this.vertAnimState,
        maxY = cs.maxY,
        currMaxY = cs.localMaxY,
        prevScaleX = ls.scaleX,
        prevScaleY = vas.scaleY,
        prevTranslateX = ls.translateX,
        prevTranslateY = vas.translateY,
        pv = this.preview,
        targetScaleX = 1 / (pv.carrier.end - pv.carrier.begin),
        targetScaleY = maxY / currMaxY,
        vbWidth = this.mainChart.viewBox.width,
        targetTranslateX = -1 * vbWidth * pv.carrier.begin,
        targetTranslateY = currMaxY - maxY,
        currentScaleX = prevScaleX + (targetScaleX - prevScaleX) * progress,
        currentScaleY = prevScaleY + (targetScaleY - prevScaleY) * progressV,
        currentTranslateX = prevTranslateX + (targetTranslateX - prevTranslateX) * progress,
        currentTranslateY = (prevTranslateY * prevScaleY + (targetTranslateY * targetScaleY - prevTranslateY * prevScaleY) * progressV) / (prevScaleY + (targetScaleY - prevScaleY) * progressV);

    this.mainChart.chartsG.setAttribute("transform", " scale(" + currentScaleX + " " + currentScaleY +") translate(" + currentTranslateX + " " + currentTranslateY  + ")");
};

Telecharm.prototype.smoothlyUpdatePreview = function() {
    let progress = this.animationState.vertScaleProgress,
        cs = this.currentState,
        ls = this.lastState,
        vas = this.vertAnimState,
        maxY = cs.maxY,
        currMaxY = cs.displayedMaxY,
        prevScaleY = ls.previewScaleY,
        prevTranslateY = ls.displayedMaxY - maxY,
        previewChanged = false,
        targetScaleY = maxY / currMaxY,
        targetTranslateY = currMaxY - maxY,
        currentScaleY = prevScaleY + (targetScaleY - prevScaleY) * progress,
        currentTranslateY = (prevTranslateY * prevScaleY + (targetTranslateY * targetScaleY - prevTranslateY * prevScaleY) * progress) / (prevScaleY + (targetScaleY - prevScaleY) * progress);

    this.dots.displayedCharts.forEach(name => {
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

    this.dots.displayedCharts.forEach(name => {
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

    let chartsBackG = this.preview.chartsBackG = document.createElementNS(this.svgns, "g");

    this.dots.displayedCharts.forEach(name => {
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
    this.dots.displayedCharts.forEach(name => {
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

Telecharm.prototype.updateSlider = function() {
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

    this.requestViewUpdate();
};

Telecharm.prototype.leftHandlerDrag = function(e) {
    this.dragLeft = true;
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

    this.requestViewUpdate();
};

Telecharm.prototype.rightHandlerDrag = function(e) {
    this.dragRight = true;
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

    this.requestViewUpdate();
};

Telecharm.prototype.bindHandler = function() {
    return function(e) {
        this.dragProcessing = true;
        this.currentStateSnapshot(this.lastState);

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
            this.dragProcessing = false;
            this.dragLeft = false;
            this.dragRight = false;
            document.onmousemove = null;
            document.onmouseup = null;
        }.bind(this);
    }.bind(this)
};

Telecharm.prototype.bindTouchHandler = function() {
    return function(e) {
        this.dragProcessing = true;
        this.currentStateSnapshot(this.lastState);

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

        document.ontouchend = function() {
            this.dragProcessing = false;
            this.dragLeft = false;
            this.dragRight = false;
            document.ontouchmove = null;
            document.ontouchstart = null;
        }.bind(this);
    }.bind(this)
};

Telecharm.prototype.currentStateSnapshot = function(state) {
    var { maxY, currMaxY } = this.getMaxs(),
        pv = this.preview,
        prevScaleX = 1 / (pv.carrier.end - pv.carrier.begin),
        prevScaleY = maxY / currMaxY,
        displayedMaxY = this.getDisplayedMaxY(),
        previewScaleY = maxY / displayedMaxY,
        prevTranslateX = -1 * this.mainChart.viewBox.width * pv.carrier.begin,
        prevTranslateY = currMaxY - maxY;

    state.time = performance.now();
    state.maxY = maxY;
    state.localMaxY = currMaxY;
    state.scaleX = prevScaleX;
    state.scaleY = prevScaleY;
    state.translateX = prevTranslateX;
    state.translateY = prevTranslateY;
    state.carrierBegin = pv.carrier.begin;
    state.carrierEnd = pv.carrier.end;
    state.displayedMaxY = displayedMaxY;
    state.previewScaleY = previewScaleY;
    state.dragLeft = this.dragLeft;
    state.dragRight = this.dragRight;
};

Telecharm.prototype.copyStateSnapshot = function(stateFrom, stateTo) {
    stateTo.time = stateFrom.time;
    stateTo.maxY = stateFrom.maxY;
    stateTo.localMaxY = stateFrom.localMaxY;
    stateTo.scaleX = stateFrom.scaleX;
    stateTo.scaleY = stateFrom.scaleY;
    stateTo.translateX = stateFrom.translateX;
    stateTo.translateY = stateFrom.translateY;
    stateTo.carrierBegin = stateFrom.carrierBegin;
    stateTo.carrierEnd = stateFrom.carrierEnd;
    stateTo.displayedMaxY = stateFrom.displayedMaxY;
    stateTo.previewScaleY = stateFrom.previewScaleY;
    stateTo.dragLeft = stateFrom.dragLeft;
    stateTo.dragRight = stateFrom.dragRight;
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
    handlerRect.ontouchstart = this.bindTouchHandler();
};

Telecharm.prototype.drawYAxis = function(scY) {
    let svgTextY = this.axis.svgTextY = document.createElementNS(this.svgns, "svg");

    svgTextY.style.width = '5%';
    svgTextY.style.height = this.mainChart.element.height;
    svgTextY.style.position = 'absolute';
    svgTextY.style.top = 0;
    svgTextY.style.left = 0;

    svgTextY.setAttribute('viewBox', [0, 0, this.containerSvg.offsetWidth / 20, this.containerSvg.offsetHeight].join(" "));

    let { maxY, currMaxY: currVBHeight } = this.getMaxs(),
        Y = 0,
        dY = 2 * currVBHeight / 11,
        gL = this.axis.gYLines = document.createElementNS(this.svgns, "g"),
        gT = this.axis.gYText = document.createElementNS(this.svgns, "g"),
        scaleY = scY ? scY : maxY/currVBHeight,
        textScale = this.containerSvg.offsetHeight / currVBHeight;

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
        text.setAttribute("y", ((currVBHeight - Y) * textScale - 5) / scaleY);
        text.setAttribute("fill", "#777777");
        text.setAttribute("vector-effect", "non-scaling-stroke");

        text.innerHTML = Math.round(Y);

        gT.appendChild(text);

        Y += dY;
    }

    svgTextY.appendChild(gT);
    this.containerSvg.appendChild(svgTextY);

    this.axis.svg.appendChild(this.axis.gYLines);

};

Telecharm.prototype.drawXAxis = function() {
    let svgTextX = this.axis.svgTextX = document.createElementNS(this.svgns, "svg");

    svgTextX.style.width = this.mainChart.element.width;
    svgTextX.style.height = '5%';
    svgTextX.style.position = 'absolute';
    svgTextX.style.bottom = '10%';
    svgTextX.style.left = 0;

    svgTextX.setAttribute('viewBox', [0, 0, this.containerSvg.offsetWidth, this.containerSvg.offsetHeight / 20].join(" "));

    let Xs = this.dots.Xs,
        lenXs = Xs.length,
        dotsStart = Math.floor(lenXs * this.preview.carrier.beginToRender),
        dotsEnd = Math.round(lenXs * this.preview.carrier.endToRender),
        len = dotsEnd - dotsStart,
        scaleX = this.currentState.scaleX,
        translateX = this.currentState.translateX,
        segDotsLen, X = 0, dX, segments, startDotX,
        vbWidth = this.containerSvg.offsetWidth,
        gX = this.axis.gX = document.createElementNS(this.svgns, "g");

    // gX.setAttribute("transform", "translate(" + translateX + " 0)");

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
    X = startDotX * vbWidth / len - dX;

    gX.setAttribute("data-dx", dX);
    gX.setAttribute("data-seglen", segDotsLen);
    gX.setAttribute("data-trx", 0);

    for (let i = dotsStart + startDotX - segDotsLen; i >= lenXs || i < dotsEnd + segDotsLen; i += segDotsLen) {
        if (i < 0) {
            continue;
        }

        let text = this.createXAxisText(Xs[i], X);
        text.setAttribute("data-x", X);
        text.setAttribute("data-idx", i);

        gX.appendChild(text);
        X += dX;
    }

    svgTextX.appendChild(this.axis.gX);
    this.containerSvg.appendChild(svgTextX);
};

Telecharm.prototype.createXAxisText = function(value, coordX) {
    let text = document.createElementNS(this.svgns, "text");
    let date = value;

    text.setAttribute("class", "axis");
    text.setAttribute("x", coordX);
    text.setAttribute("y", this.containerSvg.offsetHeight * 0.05);
    text.setAttribute("fill", "#777777");
    text.setAttribute("vector-effect", "non-scaling-stroke");

    text.innerHTML = this.getDateText(date);

    return text;
};

Telecharm.prototype.getDateText = function(date) {
    return date.getDate() + " " + this.months[date.getMonth()]
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

    this.drawYAxis();
    this.drawXAxis();

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
            top: -8px;
            margin-right: 4px;
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

        if (this.dots.displayedCharts.size == 1 && btn.classList.contains("selected")) {
            return;
        }

        btn.classList.toggle("selected");

        this.currentStateSnapshot(this.lastState);

        if (this.dots.displayedCharts.has(name)) {
            this.dots.displayedCharts.delete(name);
            this.dots.hiddenCharts.add(name);
        } else {
            this.dots.displayedCharts.add(name);
            this.dots.hiddenCharts.delete(name);
        }

        this.requestViewUpdate();
    }.bind(this);
};

document.addEventListener("DOMContentLoaded", () => {
    charm = new Telecharm({
        data: data[0],
        container: "chart"
    });
});
