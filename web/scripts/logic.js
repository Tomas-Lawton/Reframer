class SimpleStack {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.historyHolder = [];
    }
}

class SketchHandler {
    // Maintains a logical state for sending over WS
    constructor() {
        this.drawState = null;

        // Sketching Data
        this.prompt = null;
        this.svg = null;
        this.frameSize = canvas.getBoundingClientRect().width;

        // Defaults
        this.strokeColor = "#181818";
        this.strokeWidth = 8;
        this.opacity = 1;
        this.penMode = "pen";
        this.clipDrawing = false;
        this.maximumTraces = 1; // todo change
        this.step = 1;
        this.lastRollingLoss = 0;
        this.linesDisabled = false;
        this.activeStates = [
            "drawing",
            "generating",
            "refining",
            "redrawing",
            "continuing",
        ];
        this.lastHistoryIndex = 0;
        this.penDropMode = "pen";

        // TODO Refactor
        this.buttonControlLeft = true;

        // User Initialised
        this.drawRegion = null;
        this.selectionBox = null;
        this.lastRender = null;
        this.lastPrompt = null;
        this.isFirstIteration = null;
        this.lastRollingLoss = null;
        this.traces = null;
        this.boundingBox = null;
        this.transformGroup = null;

        // Settings panel
        this.useAdvanced = false;
        this.initRandomCurves = true;
        this.numRandomCurves = 32;
        this.showAICurves = 3;
        this.numTraces = 1;

        // Undo/redo stack
        this.stack = new SimpleStack();
    }
    updateDrawer({ status, svg, hasRegion, frameSize, prompt, lines }) {
        mainSketch.isFirstIteration = true; //reset canvas
        const canvasBounds = canvas.getBoundingClientRect(); //avoid canvas width glitches
        mainSketch.lastPrompt = prompt;
        const res = {
            status: status,
            data: {
                prompt: prompt,
                svg: svg,
                random_curves: lines,
                frame_size: frameSize,
                region: {
                    activate: hasRegion,
                    x1: mainSketch.drawRegion ? mainSketch.drawRegion.x : 0,
                    y1: mainSketch.drawRegion ?
                        canvasBounds.height - mainSketch.drawRegion.y :
                        0,
                    x2: mainSketch.drawRegion ?
                        mainSketch.drawRegion.x + mainSketch.drawRegion.width :
                        canvasBounds.width,
                    y2: mainSketch.drawRegion ?
                        canvasBounds.height -
                        mainSketch.drawRegion.y -
                        mainSketch.drawRegion.height // use non-web y coords
                        :
                        canvasBounds.height, // same as width
                },
            },
        };
        ws.send(JSON.stringify(res));
        console.log(res);
    }
    draw(withRegion = false, svg = null, disableLines = false) {
        if (noPrompt()) {
            openModal({
                title: "Type a prompt first!",
                message: "You need a target for AI sketching.",
            });
            return;
        }
        mainSketch.linesDisabled = disableLines;
        this.updateDrawer({
            status: "draw",
            svg: svg || this.svg,
            hasRegion: withRegion,
            frameSize: this.frameSize,
            prompt: this.prompt,
            lines: disableLines ?
                0 :
                this.initRandomCurves ?
                this.numRandomCurves :
                0,
        });
        this.step = 1;
        this.clipDrawing = true;
        setActionUI(disableLines ? "refining" : "drawing");
    }
    generate() {
        if (!exemplarSize) {
            console.error("exemplars not found");
        }
        if (noPrompt()) {
            openModal({
                title: "Type a prompt first!",
                message: "You need a target for AI exemplars.",
            });
            return;
        }
        this.updateDrawer({
            status: "sketch_exemplars",
            svg: this.svg,
            hasRegion: false,
            frameSize: exemplarSize,
            prompt: this.prompt,
            lines: this.initRandomCurves ? this.numRandomCurves : 0,
        });
        this.clipDrawing = true;
        setActionUI("generating");
    }
    redraw() {
        this.updateDrawer({
            status: "redraw",
        });
        this.step = 1;
        this.clipDrawing = true;
        setActionUI("redrawing");
    }
    continue () {
        // need to change this so it supports updating the prompt or using a new svg
        this.updateDrawer({
            status: "continue",
            prompt: this.prompt,
            frameSize: this.frameSize, //can remove?
        });
        this.clipDrawing = true;
        console.log("continuing with potential updated prompt");
        setActionUI("continuing");
    }
    continueSketch() {
        // need to change this so it supports updating the prompt or using a new svg
        console.log(this.svg);
        this.updateDrawer({
            status: "continue_sketch",
            svg: this.svg,
            frameSize: this.frameSize, //can remove?
        });
        this.clipDrawing = true;
        console.log("continuing with updated sketch");
        setActionUI("continuing");
    }
    stop() {
        if (this.drawState === "active") {
            timeKeeper.style.visibility = "visible";
        }

        this.updateDrawer({ status: "stop" });
        this.clipDrawing = false;
        setActionUI("stop");
    }
    pause() {
        // if (this.drawState === "active") {
        //     timeKeeper.style.visibility = "visible";
        // }

        this.updateDrawer({ status: "stop" });
        this.clipDrawing = false;
        // setActionUI("stop");
    }
    resetHistory() {
        mainSketch.step = 1; // reset since not continuing
        mainSketch.stack.historyHolder = [{ svg: "" }];
        timeKeeper.style.width = "0";
        timeKeeper.setAttribute("max", "0");
        timeKeeper.value = "0";
    }
}

mainSketch = new SketchHandler();

const importToSketch = () => {
    console.log("IMPORTING");
    // Clear the sketch
    // scale the whole exemplar
    console.log(exemplarScope.projects[0]);
    let expandedExemplar = exemplarScope.projects[0].activeLayer
        .scale(scaleRatio)
        .exportJSON();
    let reducedSketch = userLayer.scale(1 / scaleRatio).exportJSON();

    exemplarScope.projects[0].activeLayer.clear();
    userLayer.clear();

    let newSketch = userLayer.importJSON(expandedExemplar);
    let newExemplar =
        exemplarScope.projects[0].activeLayer.importJSON(reducedSketch);
    newSketch.position = new Point(canvas.width / 2, canvas.width / 2);
    newExemplar.position = new Point(
        exemplarSize.width / 2,
        exemplarSize.width / 2
    );
    // import each path individually.
};

const setActionUI = (state) => {
    aiMessage.classList.remove("typed-out");

    if (mainSketch.activeStates.includes(state)) {
        // AI is "thinking"
        actionControls.forEach((elem) => {
            elem.classList.add("inactive-action");
            elem.classList.remove("active");
        });
        // actionControls[0].classList.add("inactive-action");
        // actionControls[1].classList.add("inactive-action");
        // actionControls[2].classList.add("inactive-action");
        stopButton.classList.remove("inactive-action");
        stopButton.style.background = "#ff6060";

        document.getElementById("spinner").style.display = "flex";
        if (state == "drawing") {
            aiMessage.innerHTML = `Got it! I'm drawing a ${mainSketch.prompt}!`;
            actionControls[0].classList.add("active");
        } else if (state == "refining") {
            aiMessage.innerHTML = `Okay, refining the lines for a ${mainSketch.prompt}...`;
            actionControls[1].classList.add("active");
        } else if (state == "redrawing") {
            aiMessage.innerHTML = `No worries, how about this instead?`;
            actionControls[2].classList.add("active");
        } else if (state == "generating") {
            aiMessage.innerHTML = `Sure! Adding a ${mainSketch.prompt} to the moodboard!`;
            actionControls[3].classList.add("active");
        } else if (state == "continuing") {
            aiMessage.innerHTML = `Cool idea, I'll make it a ${mainSketch.prompt}.`;
        }
        aiMessage.classList.add("typed-out");
    } else if (state === "stop") {
        // AI is waiting
        actionControls.forEach((elem) => {
            elem.classList.remove("inactive-action");
            elem.classList.remove("active");
        });
        stopButton.style.background = "#e1e1e1";

        document.getElementById("spinner").style.display = "none";

        aiMessage.innerHTML = "I'm stopping! What can we draw next?";
        aiMessage.classList.add("typed-out");

        // timeKeeper
        document.getElementById("contain-dot").style.display = "flex";
    }
    mainSketch.drawState = state;
};

const unpackGroup = () => {
    if (mainSketch.transformGroup !== null) {
        // Need to apply the group scale to the paths within the group
        mainSketch.transformGroup.applyMatrix = true;
        // how does scaling the group change the path children?
        userLayer.insertChildren(
            mainSketch.transformGroup.index,
            mainSketch.transformGroup.removeChildren()
        );
        mainSketch.transformGroup.remove();
        mainSketch.transformGroup = null;
    }
};

const fitToSelection = (items, state) => {
    let bbox = items.reduce((bbox, item) => {
        return !bbox ? item.bounds : bbox.unite(item.bounds);
    }, null);
    // Add stroke width so no overflow over bounds?
    mainSketch.boundingBox = new Path.Rectangle(bbox);
    mainSketch.boundingBox.strokeColor = "#D2D2D2";
    mainSketch.boundingBox.strokeWidth = 2;
    mainSketch.boundingBox.data.state = state;
};

const getSelectedPaths = () =>
    userLayer.getItems().filter((path) => path.selected);

const toggleArtControls = () => {
    if (artControls.style.display == "flex") {
        artControls.style.display = "none";
    } else {
        artControls.style.display = "flex";
    }
};

const noPrompt = () =>
    mainSketch.prompt === "" ||
    mainSketch.prompt === null ||
    mainSketch.prompt === prompt.getAttribute("placeholder");

const openModal = (data) => {
    if (data.hasOwnProperty("ui")) {
        modalContent.innerHTML = null;
        data.ui.style.display = "flex";
        modalContent.appendChild(data.ui);
    } else {
        if (modalContent.firstChild) {
            modalContent.firstChild.style.display = "none";
            document.body.appendChild(modalContent.firstChild); //store on body
        }
        modalContent.innerHTML = null;
    }

    let cancel = () =>
        data.hasOwnProperty("cancelAction") ?
        data.cancelAction() :
        (modal.style.display = "none");
    let confirm = () =>
        data.hasOwnProperty("confirmAction") ?
        data.confirmAction() :
        (modal.style.display = "none");
    let close = () => cancel();

    document.getElementById("modal-title").innerHTML = data.title;
    document.getElementById("modal-message").innerHTML = data.message;

    document.getElementById("cancel-modal").onclick = () => cancel();
    document.getElementById("modal-cross").onclick = () => close();
    document.getElementById("confirm-modal").onclick = () => confirm();
    modal.style.display = "block";
};

// const switchControls = () => {
//     if (mainSketch.buttonControlLeft) {
//         console.log(window.innerWidth);
//         buttonPanel.style.left = `${window.innerWidth - buttonPanel.offsetWidth}px`;
//     } else {
//         buttonPanel.style.left = 0;
//     }
//     mainSketch.buttonControlLeft = !mainSketch.buttonControlLeft;
// };

// dragging moves select elements + ui
const hideSelectUI = (includeTransform = true) => {
    // remove rect
    if (mainSketch.boundingBox) {
        mainSketch.boundingBox.remove();
        mainSketch.boundingBox = null;
    }
    // hide ui
    if (includeTransform) {
        transformControl.style.display = "none";
    }
    deleteHandler.style.display = "none";
    initialiseHandler.style.display = "none";
};

const updateRectBounds = (from, to) => {
    mainSketch.boundingBox.bounds = new Rectangle(from, to);
    mainSketch.boundingBox.strokeColor = "#D2D2D2";
    mainSketch.boundingBox.strokeWidth = 2;
    mainSketch.boundingBox.data.state = "resizing";
    updateSelectPosition();
};

const updateSelectPosition = () => {
    let uiOffset = deleteHandler.getBoundingClientRect().height / 2;
    deleteHandler.style.left = mainSketch.boundingBox.bounds.topRight.x + "px";
    initialiseHandler.style.left = mainSketch.boundingBox.bounds.topLeft.x + "px";
    deleteHandler.style.top = mainSketch.boundingBox.bounds.top - uiOffset + "px";
    initialiseHandler.style.top =
        mainSketch.boundingBox.bounds.top - uiOffset + "px";
};

const updateSelectUI = () => {
    if (mainSketch.boundingBox) {
        deleteHandler.style.display = "block";
        // initialiseHandler.style.display = "block";

        transformControl.style.display = "flex";
        updateSelectPosition();
    }
};

const deletePath = () => {
    selected = getSelectedPaths();
    if (selected.length > 0) {
        pathList = selected.map((path) => path.exportJSON()); //dont use paper ref
        console.log(pathList);
        mainSketch.stack.undoStack.push({
            type: "delete-event",
            data: pathList,
        });
        selected.map((path) => path.remove());
    }
    if (mainSketch.boundingBox) {
        hideSelectUI();
    }
    mainSketch.transformGroup = null;
};

// switchControls();

const parseFromSvg = (svg) => {
    if (svg === "") return null;
    let paperObject = userLayer.importSVG(svg);
    const numPaths = paperObject.children[0].children.length;
    for (const returnedIndex in paperObject.children[0].children) {
        const child = paperObject.children[0].children[returnedIndex];
        child.smooth();

        // AI Stroke Effects
        if (mainSketch.initRandomCurves && !mainSketch.linesDisabled) {
            if (returnedIndex >= numPaths - mainSketch.numRandomCurves) {
                // ai paths
                child.opacity = 0.5;
            }
        }

        const pathEffect = child.clone({ insert: false });
        if (returnedIndex < mainSketch.showAICurves) {
            //only add a certain count of paths
            userLayer.addChild(pathEffect);
        }
        // const pathEffect = child.clone({ insert: false });
        // userLayer.addChild(pathEffect);
    }
    paperObject.remove();
    mainSketch.svg = paper.project.exportSVG({
        asString: true,
    });
    return paperObject;
};

const getHistoryBatch = (maxSize, startIdx) => {
    let len = mainSketch.stack.historyHolder.length;
    if (len <= 1) return null;
    let traceList = [];
    let batchSize = Math.min(maxSize, startIdx); // not first item
    // num traces
    for (let i = 0; i < batchSize; i++) {
        traceList.push(mainSketch.stack.historyHolder[startIdx - i - 1]);
    }
    return traceList;
};

// update because loss varies a lot??
const calcRollingLoss = () => {
    const items = getHistoryBatch(
        setTraces.value,
        mainSketch.stack.historyHolder.length - 1
    );
    if (items) {
        const sum = items.reduce(
            (partialSum, historyItem) => partialSum + historyItem.loss,
            0
        );
        const newRollingLoss = sum / items.length;
        // if (mainSketch.lastRollingLoss !== undefined) {
        //     if (Math.abs(mainSketch.lastRollingLoss - newRollingLoss) < 0.0001) {
        //         lossText.innerHTML = `Converged at: ${newRollingLoss}`;
        //         stopClip();
        //     }
        // }
        mainSketch.lastRollingLoss = newRollingLoss;
    }
};

const showTraceHistoryFrom = (fromIndex) => {
    const items = getHistoryBatch(mainSketch.numTraces, fromIndex);
    if (items) {
        mainSketch.traces = null;
        let refList = [];
        for (let pastGen of items) {
            userLayer.importSVG(pastGen.svg);
            refList.push(parseFromSvg(pastGen.svg));
        }
        mainSketch.traces = refList;
    }
};

ws.onmessage = function(event) {
    if (mainSketch.clipDrawing) {
        //only react if active

        try {
            result = JSON.parse(event.data);
        } catch (e) {
            console.log("Unexpected JSON event\n", e);
        }

        if (result.status === "stop") {
            console.log("Stopped drawer");
            mainSketch.clipDrawing = false;
            // stop exemplars also?
        }

        if (result.status === "draw") {
            //sketch
            if (mainSketch.isFirstIteration) {
                userLayer.clear();
                mainSketch.isFirstIteration = false;
            } else {
                // Delete ref to last gen and old mainSketch.traces
                if (mainSketch.lastRender) {
                    mainSketch.lastRender.remove();
                }
                if (mainSketch.traces) {
                    for (const trace of mainSketch.traces) {
                        trace.remove();
                    }
                }
            }
            mainSketch.stack.historyHolder.push(result);
            timeKeeper.style.width = "100%";
            timeKeeper.setAttribute("max", String(mainSketch.step));
            timeKeeper.value = String(mainSketch.step);
            setTraces.setAttribute("max", String(mainSketch.step));
            mainSketch.step += 1; //avoid disconnected iteration after stopping

            // To do change this so it is just max num mainSketch.traces
            if (mainSketch.numTraces > 1) {
                // setTraces.value = String(step);
                // getHistoryBatch
                userLayer.clear();
                showTraceHistoryFrom(mainSketch.stack.historyHolder.length - 1);
            } else {
                userLayer.clear();
                if (mainSketch.showAICurves < mainSketch.numRandomCurves) {
                    mainSketch.showAICurves += Math.floor(Math.random() * 4);
                }
                mainSketch.lastRender = parseFromSvg(result.svg);
            }

            calcRollingLoss();
            lossText.innerHTML = `Step: ${mainSketch.step - 1}\nLoss: ${
        mainSketch.lastRollingLoss > 0
          ? mainSketch.lastRollingLoss.toPrecision(5)
          : 0
      }`;

            console.log(
                `Draw iteration: ${result.iterations} \nLoss value: ${result.loss}`
            );
        }
        var matches = result.status.match(/\d+/g); //if status contains a number
        if (matches != null) {
            if (result.svg === "") return null;
            let thisCanvas = exemplarScope.projects[parseInt(result.status)];
            // exemplar_canvas.activate();
            thisCanvas.clear();
            let imported = thisCanvas.importSVG(result.svg);
            console.log(imported);
            document.querySelectorAll(".card-info div p")[
                parseInt(result.status)
            ].innerHTML = `Loss: ${result.loss.toPrecision(5)}`;
        }
    }
};

const setPenMode = (mode, accentTarget) => {
    let lastPenMode = mainSketch.penMode;
    mainSketch.penMode = mode;

    document.querySelectorAll(".pen-mode").forEach((mode) => {
        mode.classList.remove("selected-mode");
        mode.classList.add("simple-hover");
    });
    accentTarget.classList.add("selected-mode");
    accentTarget.classList.remove("simple-hover");

    switch (mode) {
        case "pen-drop":
            // Default click
            mainSketch.penMode = mainSketch.penDropMode;
            if ((mainSketch.penMode = "erase")) {
                eraseTool.activate();
            } else {
                multiTool.activate();
            }
            // Dropdown
            if (dropdown.style.display === "none" || !dropdown.style.display) {
                dropdown.style.display = "flex";
                let penButton = document
                    .getElementById("pen-drop")
                    .getBoundingClientRect();
                let bar = buttonPanel.getBoundingClientRect();
                dropdown.style.top = bar.bottom + "px";
                dropdown.style.left = penButton.left + penButton.width / 2 + "px";
            } else {
                dropdown.style.display = "none";
            }
            break;
        case "erase":
            // Refactor to remove all in arr and then add just the one used
            penDrop.classList.remove("fa-pen");
            penDrop.classList.add("fa-eraser");
            eraseTool.activate();
            mainSketch.penDropMode = "erase";
            break;
        case "pen":
            penDrop.classList.remove("fa-eraser");
            penDrop.classList.add("fa-pen");
            multiTool.activate();
            "pen";
            break;
        case "select":
            dropdown.style.display = "none";
            multiTool.activate();
            break;
        case "lasso":
            multiTool.activate();
            if (noPrompt()) {
                mainSketch.penMode = lastPenMode;
                openModal({
                    title: "Add a prompt first!",
                    message: "You need a prompt to generate sketches with the region tool.",
                });
                break;
            }
            mainSketch.penDropMode = "lasso";
            break;
    }

    // Not-pen mode
    if (mainSketch.penMode !== "select") {
        userLayer.getItems().forEach((path) => {
            // console.log(path);
            path.selected = false;
        });
        hideSelectUI();
    }
    // if (mainSketch.penMode !== "pen" && mainSketch.penMode !== "erase") {
    //     palette.style.display = "none";
    //     artControls.style.display = "none";
    // } else {
    //     palette.style.display = "block";
    // }
    // if (mainSketch.penMode !== "pen" && mainSketch.penMode !== "select") {
    //     artControls.style.display = "none";
    // }
    if (mainSketch.penMode !== "lasso" && mainSketch.penMode !== "select") {
        mainSketch.drawRegion = undefined;
        if (regionPath) regionPath.remove();
    }
    if (mainSketch.penMode !== "lasso") {
        // userLayer.activate();
    }
    // console.log(mainSketch.penMode);
};

const getRGBA = () => {
    let rgba = mainSketch.strokeColor.replace(/[^\d,]/g, "").split(",");
    rgba[3] = mainSketch.opacity;
    let col = `rgba(${rgba.join()})`;
    console.log(col);
    document.getElementById("pen-color").style.background = col;
    document.getElementById("point-size").style.background = col;
};