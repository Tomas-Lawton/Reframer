if (useAI) {
    ws.onmessage = function(event) {
        try {
            loadResponse(JSON.parse(event.data));
        } catch (e) {
            if ((event.data.match(/{/g) || []).length > 1) {
                console.log("Parsing Concurrent JSON events");
            }
            console.log("Cooked ", e);
            controller.clipDrawing = false;
        }
    };
}

const createGroup = (items) => {
    setDefaultTransform();
    controller.transformGroup = new Group({
        children: items,
        strokeScaling: false,
        transformContent: false,
    });
};

const transformGroup = (g, t, a) => {
    g[t] = a;
    hideSelectUI(false);
    let items = getSelectedPaths();
    fitToSelection(items, "rotating");
    updateSelectUI();
};

const scaleGroup = (group, to) => {
    group.scale(to, new Point(0, 0));
    group.children.forEach((item) => {
        item.strokeWidth *= to;
    });
    return group;
};

const setPointSize = (s) => {
    const point = document.getElementById("point-size");
    controller.strokeWidth = s;
    point.style.width = controller.strokeWidth + "px";
    point.style.height = controller.strokeWidth + "px";
    getSelectedPaths().forEach(
        (item) => (item.strokeWidth = controller.strokeWidth)
    );
};

const ungroup = () => {
    let selected;
    if (controller.transformGroup !== null) {
        controller.transformGroup.applyMatrix = true;
        selected = controller.transformGroup.removeChildren();
        userLayer.insertChildren(controller.transformGroup.index, selected);
        controller.transformGroup.remove();
        controller.transformGroup = null;
    }
    hideSelectUI();
    return selected;
};

//TODO: Add stroke width so no overflow over bounds?
const fitToSelection = (items, state) => {
    let bbox = items.reduce((bbox, item) => {
        return !bbox ? item.bounds : bbox.unite(item.bounds);
    }, null);
    // Also shouldn't set the boundingBox, should set boundingBox.bounds ???
    controller.boundingBox = new Path.Rectangle(bbox);
    controller.boundingBox.sendToBack();
    controller.boundingBox.set({
        fillColor: "#f5f5f5",
        opacity: 0.4,
        strokeColor: "#7b66ff",
        strokeWidth: 2,
    });
    controller.boundingBox.data.state = state;
    return controller.boundingBox;
};

const getSelectedPaths = () =>
    userLayer.getItems().filter((path) => path.selected);

const noPrompt = () =>
    controller.prompt === "" ||
    controller.prompt === null ||
    controller.prompt === prompt.getAttribute("placeholder");

// const switchControls = () => {
//     if (controller.buttonControlLeft) {
//         console.log(window.innerWidth);
//         buttonPanel.style.left = `${window.innerWidth - buttonPanel.offsetWidth}px`;
//     } else {
//         buttonPanel.style.left = 0;
//     }
//     controller.buttonControlLeft = !controller.buttonControlLeft;
// };

const isDeselect = (e, hitResult) => {
    // TO change to simple hit test
    let isInBounds = null;
    if (controller.boundingBox) {
        isInBounds =
            e.point.x > controller.boundingBox.bounds.left &&
            e.point.x < controller.boundingBox.bounds.right &&
            e.point.y > controller.boundingBox.bounds.top &&
            e.point.y < controller.boundingBox.bounds.bottom;
    }
    return (!hitResult && !isInBounds) || (!hitResult && isInBounds == null);
};

const deleteItems = () => {
    // Save
    let selectedPaths = ungroup();
    selectedPaths.forEach((path) => {
        path.selected = false;
    });

    sketchHistory.pushUndo();

    // Delete
    mainSketch.userPathList = mainSketch.userPathList.filter(
        (ref) => !selectedPaths.includes(ref)
    );
    selectedPaths.forEach((path) => path.remove());

    // Save new SVG
    mainSketch.svg = paper.project.exportSVG({
        asString: true,
    });

    if (controller.liveCollab) {
        controller.continueSketch();
        controller.liveCollab = false;
    }
    logger.event("deleted-path");
};

const getHistoryBatch = (maxSize, startIdx) => {
    let len = sketchHistory.historyHolder.length;
    if (len <= 1) return null;
    let traceList = [];
    let batchSize = Math.min(maxSize, startIdx); // not first item

    for (let i = 0; i < batchSize; i++) {
        // num traces
        traceList.push(sketchHistory.historyHolder[startIdx - i - 1]);
    }
    return traceList;
};

const calcRollingLoss = () => {
    const items = getHistoryBatch(
        setTraces.value,
        sketchHistory.historyHolder.length - 1
    );
    if (items) {
        const sum = items.reduce(
            (partialSum, historyItem) => partialSum + historyItem.loss,
            0
        );
        const newRollingLoss = sum / items.length;
        controller.lastRollingLoss = newRollingLoss;
    }
};

// TO DO make worker with new loader
const showTraceHistoryFrom = (fromIndex) => {
    const items = getHistoryBatch(controller.numTraces, fromIndex);
    if (items) {
        controller.traces = null;
        let refList = [];
        for (let stored of items) {
            userLayer.importSVG(stored.svg);
            // refList.push(mainSketch.load(1, stored.svg, stored.num));
        }
        controller.traces = refList;
    }
};

const incrementHistory = () => {
    sketchHistory.historyHolder.push({
        svg: mainSketch.svg,
        num: mainSketch.userPathList.length,
    });
    timeKeeper.setAttribute("max", String(controller.step + 1));
    timeKeeper.value = String(controller.step + 1);
    setTraces.setAttribute("max", String(controller.step + 1));
    controller.step += 1;
};

const getRGBA = () => {
    let rgba = controller.strokeColor.replace(/[^\d,]/g, "").split(",");
    rgba[3] = controller.opacity;
    return `rgba(${rgba.join()})`;
};

const download = () => {
    // REMOVE REFs to select box
    // to do: refactor these.
    userLayer.getItems().forEach((path) => {
        path.selected = false;
    });

    canvas.toBlob((blob) => {
        let url = window.URL || window.webkitURL;
        let link = url.createObjectURL(blob);
        let isIE = false || !!document.documentMode;
        if (isIE) {
            window.navigator.msSaveBlob(blob, fileName);
        } else {
            let a = document.createElement("a");
            a.setAttribute("download", "sketch.png");
            a.setAttribute("href", link);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    });

    mainSketch.svg = paper.project.exportSVG({
        asString: true,
    });
    logger.event("save-sketch");

    if (!useAI) {
        location.reload();
    }
};

const loadResponse = (result) => {
    console.log("Result: ", result);

    if (controller.clipDrawing) {
        // Main
        if (result.status === "None") {
            updateMain(result);
        }

        // Explore
        var matches = result.status.match(/\d+/g); //if status is a num
        if (matches != null) {
            if (result.svg === "") return null;
            let sketch = controller.sketches[result.sketch_index];
            sketch.load(
                sketchSize / 224,
                result.svg,
                mainSketch.userPathList.length,
                sketch.userLayer
            );
        }

        // Prune Main
        if (controller.drawState == "pruning") {
            updateMain(result);
            setActionUI("stop-prune");
            controller.clipDrawing = false; //single update
            incrementHistory(); //still sorted
        }
    }
};

const updateMain = (result) => {
    incrementHistory();
    // if (controller.numTraces > 1) {
    //     showTraceHistoryFrom(sketchHistory.historyHolder.length - 1);
    // } else {
    mainSketch.load(
        frame / 224,
        result.svg,
        mainSketch.userPathList.length,
        true,
        true
    );
    // }
    // calcRollingLoss();
};