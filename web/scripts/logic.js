// TO DO When mainsketch is instance of Sketch add to Sketch class so can call mainsketch.saveStatic()
const saveStatic = (json, paths) => {
    let sketchCountIndex = controller.sketchScopeIndex;
    let sketch = new Sketch(
        sketchCountIndex,
        sketchScope,
        paths, //paths in main change
        "U"
    );
    let newElem = sketch.renderMini();
    let toCanvas = sketchScope.projects[sketchCountIndex];
    toCanvas.activeLayer.importJSON(json);
    newElem.classList.add("bounce");
    document.getElementById("sketch-grid").prepend(newElem);
    controller.sketchScopeIndex += 1;
};

const killExploratorySketches = () => {
    explorer.childNodes.forEach((child, i) => {
        let stopButton = child.querySelector(".fa-stop");
        let loader = child.querySelector(".card-loading");

        loader.classList.remove("button-animation");
        loader.classList.remove("fa-spinner");
        loader.classList.add("fa-check");
        stopButton.style.background = "#f5f5f5";
        stopButton.style.background = "#d2d2d2";
        controller.stopSingle(controller.inspireScopes[i]);
    });
};

const redStop = () => {
    stopButton.classList.remove("inactive-action");
    stopButton.style.background = "#ff6060";
    stopButton.style.color = "#ffffff";
    stopButton.querySelector("i").style.color = "#ffffff";
    stopButton.style.cursor = "pointer";
};

const inactiveStop = () => {
    stopButton.classList.add("inactive-action");
    stopButton.style.background = "#f5f5f5";
    stopButton.style.color = "#d2d2d2";
    stopButton.querySelector("i").style.color = "#d2d2d2";
    stopButton.style.cursor = "default";
};

const drawingFinished = () => {
    canvas.classList.remove("loading-canvas");
    actionControls.forEach((elem) => {
        elem.classList.remove("inactive-action");
        // elem.classList.remove("active");
    });
    document.getElementById("spinner").style.display = "none";
    document.getElementById("control-lines").style.display = "block";

    promptInput.style.display = "flex";
    // document.getElementById("add-refine").style.display = "none";
    document.getElementById("lasso").classList.remove("inactive-top-action");
    document.getElementById("undo").classList.remove("inactive-top-action");
    document.getElementById("redo").classList.remove("inactive-top-action");
    inactiveStop();
};

const setActionUI = (state) => {
    let lastDrawState = controller.drawState;
    aiMessage.classList.remove("typed-out");

    if (state == "pruning") {
        aiMessage.classList.remove("typed-out");
        aiMessage.innerHTML = "Just a moment while I tidy up!";
        aiMessage.classList.add("typed-out");
        canvas.classList.add("loading-canvas");
        actionControls.forEach((elem) => {
            elem.classList.add("inactive-action");
            // elem.classList.remove("active");
        });
        inactiveStop();
    } else if (state == "stop-prune") {
        drawingFinished();
    } else if (controller.activeStates.includes(state)) {
        actionControls.forEach((elem) => {
            elem.classList.add("inactive-action");
            // elem.classList.remove("active");
        });
        redStop();
        document.getElementById("lasso").classList.add("inactive-top-action");
        document.getElementById("undo").classList.add("inactive-top-action");
        document.getElementById("redo").classList.add("inactive-top-action");

        promptInput.style.display = "none";
        document.getElementById("spinner").style.display = "flex";

        // document.getElementById("add-refine").style.display = "block";
        // document.getElementById("respect-block").classList.add("inactive-section");

        if (state == "drawing") {
            aiMessage.innerHTML = `Got it! Drawing ${controller.prompt}!`;
            // document.getElementById("draw").classList.add("active");
        } else if (state == "explore") {
            aiMessage.innerHTML = `I've got some ideas for ${controller.prompt}!`;
            // canvas.classList.add("loading-canvas");
            document.getElementById("history-block").style.display = "none";

            // document.getElementById("inspire").classList.add("active");
        } else if (state == "continuing" || state == "continue-explore") {
            aiMessage.innerHTML = `Nice, I'll make that it into ${controller.prompt}.`;
        }
        aiMessage.classList.add("typed-out");

        document.getElementById("control-lines").style.display = "none";
    } else if (state === "stop") {
        aiMessage.innerHTML = "All done! What should we draw next?";
        aiMessage.classList.add("typed-out");
        drawingFinished();
        if (
            controller.stack.historyHolder.length > 1 //first elem empty
        ) {
            document.getElementById("history-block").style.display = "flex";
        }
    } else if (state === "stopSingle") {
        aiMessage.innerHTML = `Stopped a single sketch!`;
        aiMessage.classList.add("typed-out");
        drawingFinished();
        controller.resetMetaControls();
    }
    controller.drawState = state;
    console.log("Set: ", state);
};

const scaleSelectGroup = (g, s) => {
    g.scaling = s;
    hideSelectUI(false);
    let items = getSelectedPaths();
    fitToSelection(items, "scaling");
    updateSelectUI();
};

const rotateSelectGroup = (g, r) => {
    g.rotation = r;
    hideSelectUI(false);
    let items = getSelectedPaths();
    fitToSelection(items, "rotating");
    updateSelectUI();
};

const scaleGroup = (group, to) => {
    group.scale(to, new Point(0, 0));
    group.children.forEach((item, i) => {
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

const unpackGroup = () => {
    if (controller.transformGroup !== null) {
        controller.transformGroup.applyMatrix = true; // apply group rotation/scale to children on unpack
        userLayer.insertChildren(
            controller.transformGroup.index,
            controller.transformGroup.removeChildren()
        );
        controller.transformGroup.remove();
        controller.transformGroup = null;
    }
};

const fitToSelection = (items, state) => {
    let bbox = items.reduce((bbox, item) => {
        return !bbox ? item.bounds : bbox.unite(item.bounds);
    }, null);
    // Add stroke width so no overflow over bounds?
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
    document.getElementById("confirm-modal").onclick = () => {
        confirm();
        close();
    };
    modal.style.display = "block";
};

// const switchControls = () => {
//     if (controller.buttonControlLeft) {
//         console.log(window.innerWidth);
//         buttonPanel.style.left = `${window.innerWidth - buttonPanel.offsetWidth}px`;
//     } else {
//         buttonPanel.style.left = 0;
//     }
//     controller.buttonControlLeft = !controller.buttonControlLeft;
// };

// dragging moves select elements + ui
const hideSelectUI = (includeTransform = true) => {
    // remove rect
    if (controller.boundingBox) {
        controller.boundingBox.remove();
        controller.boundingBox = null;
    }
    // hide ui
    if (includeTransform) {
        transformControl.style.display = "none";
    }
    deleteHandler.style.display = "none";
    // initialiseHandler.style.display = "none";
    // reviseHandler.style.display = "none";
    copyHandler.style.display = "none";
};

const updateRectBounds = (from, to) => {
    controller.boundingBox.bounds = new Rectangle(from, to);
    controller.boundingBox.bounds.set({
        fillColor: "#f5f5f5",
        opacity: 0.4,
        strokeColor: "#7b66ff",
        strokeWidth: 2,
    });
    controller.boundingBox.data.state = "resizing";
    updateSelectPosition();
};

const updateSelectPosition = () => {
    let uiOffset = deleteHandler.getBoundingClientRect().height / 2 + 5;
    deleteHandler.style.left = controller.boundingBox.bounds.topRight.x + "px";
    // reviseHandler.style.left =
    //     controller.boundingBox.bounds.topLeft.x + "px";
    deleteHandler.style.top = controller.boundingBox.bounds.top - uiOffset + "px";
    // reviseHandler.style.top =
    //     controller.boundingBox.bounds.top - uiOffset + "px";

    // initialiseHandler.style.left =
    //     controller.boundingBox.bounds.topRight.x + "px";
    copyHandler.style.left = controller.boundingBox.bounds.topLeft.x + "px";
    // initialiseHandler.style.top =
    //     controller.boundingBox.bounds.bottom + uiOffset + "px";
    copyHandler.style.top =
        controller.boundingBox.bounds.bottom + uiOffset + "px";
};

const updateSelectUI = () => {
    if (controller.boundingBox && getSelectedPaths().length) {
        deleteHandler.style.display = "block";
        // initialiseHandler.style.display = "block";
        // reviseHandler.style.display = "block";
        copyHandler.style.display = "block";
        transformControl.style.display = "flex";
        updateSelectPosition();
    }
};

const deletePath = () => {
    // Save
    hideSelectUI();
    unpackGroup();
    let g = getSelectedPaths();
    g.forEach((path) => {
        path.selected = false;
    });
    controller.stack.undoStack.push({
        type: "delete-event",
        data: userLayer.exportJSON(),
    });

    // Delete
    mainSketch.userPathList = mainSketch.userPathList.filter(
        (ref) => !g.includes(ref)
    );
    g.forEach((path) => path.remove());

    // Save again
    mainSketch.svg = paper.project.exportSVG({
        asString: true,
    });

    if (liveCollab) {
        controller.continueSketch();
        liveCollab = false;
    }
    logger.event("deleted-path");
};

const showHide = (item) => {
    if (item.style.display === "flex") {
        item.style.display = "none";
    } else {
        item.style.display = "flex";
    }
};

// switchControls();

// TO DO: Add svg arr
const parseFromSvg = (s, svg, n, l, a = true) => {
    if (svg === "" || svg === undefined) return;
    l.clear();
    let g = l.importSVG(svg).children[0];
    scaleGroup(g, s);
    l.insertChildren(g.index, g.removeChildren());
    mainSketch.userPathList = [];
    l.getItems().forEach((path, i) => {
        i < n ? mainSketch.userPathList.push(path) : a && (path.opacity *= 0.5);
    });
};
// return paperObject;

const getHistoryBatch = (maxSize, startIdx) => {
    let len = controller.stack.historyHolder.length;
    if (len <= 1) return null;
    let traceList = [];
    let batchSize = Math.min(maxSize, startIdx); // not first item
    // num traces
    for (let i = 0; i < batchSize; i++) {
        traceList.push(controller.stack.historyHolder[startIdx - i - 1]);
    }
    return traceList;
};

// update because loss varies a lot??
const calcRollingLoss = () => {
    const items = getHistoryBatch(
        setTraces.value,
        controller.stack.historyHolder.length - 1
    );
    if (items) {
        const sum = items.reduce(
            (partialSum, historyItem) => partialSum + historyItem.loss,
            0
        );
        const newRollingLoss = sum / items.length;
        // if (controller.lastRollingLoss !== undefined) {
        //     if (Math.abs(controller.lastRollingLoss - newRollingLoss) < 0.0001) {
        //         lossText.innerHTML = `Converged at: ${newRollingLoss}`;
        //         stopClip();
        //     }
        // }
        controller.lastRollingLoss = newRollingLoss;
    }
};

const showTraceHistoryFrom = (fromIndex) => {
    const items = getHistoryBatch(controller.numTraces, fromIndex);
    if (items) {
        controller.traces = null;
        let refList = [];
        for (let stored of items) {
            userLayer.importSVG(stored.svg);
            refList.push(parseFromSvg(1, stored.svg, stored.num, userLayer));
        }
        controller.traces = refList;
    }
};

const incrementHistory = () => {
    controller.stack.historyHolder.push({
        svg: mainSketch.svg,
        num: mainSketch.userPathList.length,
    });
    timeKeeper.setAttribute("max", String(controller.step + 1));
    timeKeeper.value = String(controller.step + 1);
    setTraces.setAttribute("max", String(controller.step + 1));
    controller.step += 1;
};

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

const updateMainSketch = (result) => {
    incrementHistory();
    // To do change this so it is just max num controller.traces
    if (controller.numTraces > 1) {
        showTraceHistoryFrom(controller.stack.historyHolder.length - 1);
    } else {
        controller.lastRender = parseFromSvg(
            userLayer.view.viewSize.width / 224,
            result.svg,
            mainSketch.userPathList.length,
            userLayer
        );
        mainSketch.svg = paper.project.exportSVG({
            asString: true,
        });
    }
    // calcRollingLoss();
};

const loadResponse = (result) => {
    console.log("Result: ", result);

    if (controller.clipDrawing) {
        // Main
        if (result.status === "None") {
            updateMainSketch(result);
        }

        // Explore
        var matches = result.status.match(/\d+/g); //if status is a num
        if (matches != null) {
            if (result.svg === "") return null;
            let thisCanvas = sketchScope.projects[result.sketch_index];
            parseFromSvg(
                sketchSize / 224,
                result.svg,
                mainSketch.userPathList.length,
                thisCanvas.activeLayer
            );
        }

        // Prune Main
        if (controller.drawState == "pruning") {
            updateMainSketch(result);
            setActionUI("stop-prune");
            controller.clipDrawing = false; //single update
        }
    }
};

const setPenMode = (mode, accentTarget) => {
    let lastPenMode = controller.penMode;
    document.querySelectorAll(".pen-mode").forEach((mode) => {
        mode.classList.remove("selected-mode");
        mode.classList.add("simple-hover");
    });

    if (accentTarget) {
        accentTarget.classList.add("selected-mode");
        accentTarget.classList.remove("simple-hover");
    }
    switch (mode) {
        case "pen-drop":
            if (useAI) {
                if (dropdown.style.display !== "flex") {
                    dropdown.style.display = "flex";
                    dropdown.style.top =
                        buttonPanel.getBoundingClientRect().bottom + "px";
                    dropdown.style.left =
                        penDrop.getBoundingClientRect().left +
                        penDrop.getBoundingClientRect().width / 2 +
                        "px";
                    setPenMode(controller.penDropMode, penDrop);
                } else {
                    dropdown.style.display = "none";
                }
            } else {
                setPenMode("select", penDrop);
            }

            break;
        case "erase":
            if (useAI) {
                dropdown.style.display = "none";
            }
            eraseTool.activate();
            controller.penMode = mode;
            break;
        case "pen":
            let swatches = document.getElementById("swatches");

            if (window.innerWidth < 700) {
                if (swatches.style.display !== "flex") {
                    swatches.style.display = "flex";
                    swatches.style.top =
                        document.getElementById("pen-controls").getBoundingClientRect()
                        .bottom +
                        5 +
                        "px";
                } else {
                    swatches.style.display = "none";
                }
            }
            dropdown.style.display = "none";
            multiTool.activate();
            controller.penMode = mode;
            "pen";
            break;
        case "select":
            penDrop.classList.add("selected-mode");
            penDrop.classList.remove("fa-eraser");
            penDrop.classList.remove("fa-object-group");
            penDrop.classList.add("fa-arrow-pointer");
            multiTool.activate();
            controller.penMode = mode;
            controller.penDropMode = mode;
            break;
        case "lasso":
            multiTool.activate();
            if (noPrompt()) {
                controller.penMode = lastPenMode;
                openModal({
                    title: "Add a prompt first!",
                    message: "You need a prompt to generate sketches with the region tool.",
                });
            } else {
                penDrop.classList.add("selected-mode");
                penDrop.classList.remove("fa-eraser");
                penDrop.classList.remove("fa-arrow-pointer");
                penDrop.classList.add("fa-object-group");
                controller.penMode = mode;
                controller.penDropMode = mode;
            }
            break;
    }

    if (controller.penMode !== "select") {
        userLayer.getItems().forEach((path) => {
            path.selected = false;
        });
        hideSelectUI();
    }
    if (controller.penMode !== "lasso" && controller.penMode !== "select") {
        controller.drawRegion = undefined;
        if (regionPath) regionPath.remove();
        penDrop.classList.remove("selected-mode");
    }
};

const getRGBA = () => {
    let rgba = controller.strokeColor.replace(/[^\d,]/g, "").split(",");
    rgba[3] = controller.opacity;
    return `rgba(${rgba.join()})`;
};

const setLineLabels = (layer) => {
    let res = controller.maxCurves - layer.children.length;
    controller.addLines = res > 0 ? res : 0;
    document.getElementById(
        "max-lines"
    ).innerHTML = `Lines : ${controller.maxCurves}`;
    document.getElementById(
        "calc-lines"
    ).innerHTML = `Add : ${controller.addLines}`;
};

const createGroup = (items) => {
    rotateSlider.value = 0;
    rotateNumber.value = 0;
    scaleSlider.value = 10;
    scaleSlider.value = 10;
    controller.transformGroup = new Group({
        children: items,
        strokeScaling: false,
        transformContent: false,
    });
};

const downloadSketch = () => {
    // REMOVE REFs to select box
    userLayer.getItems().forEach((path) => {
        path.selected = false;
    });
    // Remove the select box
    mainSketch.svg = paper.project.exportSVG({
        asString: true,
    });
    logger.event("save-sketch");

    canvas.toBlob((blob) => {
        let url = window.URL || window.webkitURL;
        let link = url.createObjectURL(blob);
        // window.open(link, "_blank");

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
    location.reload();
};

const pauseActiveDrawer = () => {
    if (controller.activeStates.includes(controller.drawState)) {
        // TO DO: check if can just check if clip is drawing.. should work?
        liveCollab = true;
        controller.pause(); //continue on pen up
        aiMessage.classList.remove("typed-out");
        aiMessage.innerHTML = `I'mma let you finish...`;
        aiMessage.classList.add("typed-out");
    }
};