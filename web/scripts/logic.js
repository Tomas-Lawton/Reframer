const importToSketch = (exemplarIndex) => {
    console.log("IMPORTING");
    // idd index
    // let expandedExemplar = exemplarScope.projects[0].activeLayer
    //     .scale(scaleRatio)
    //     .exportJSON();
    console.log(exemplarIndex);
    let copy = exemplarScope.projects[exemplarIndex].activeLayer.clone();
    let expandedExemplar = copy.scale(scaleRatio).exportJSON(); // group containing paths not group containing group
    copy.remove();

    // exemplarScope.projects[0].activeLayer.clear();
    userLayer.clear();
    let newSketch = userLayer.importJSON(expandedExemplar);
    newSketch.getItems((path) => (path.strokeWidth *= scaleRatio));
    // rescale
    newSketch.position = new Point(
        sketchController.frameSize / 2,
        sketchController.frameSize / 2
    );

    sketchController.svg = paper.project.exportSVG({
        asString: true,
    });
};

const exportToExemplar = () => {
    console.log("EXPORTING");
    let saveSketch = userLayer.clone({ insert: true });
    let scaledSketch = saveSketch.scale(1 / scaleRatio);
    saveSketch.getItems().forEach((path) => {
        path.selected = false;
    });
    scaledSketch.getItems((item) => (item.strokeWidth /= scaleRatio));
    let save = scaledSketch.exportJSON();
    scaledSketch.remove();
    return save;
};

const setActionUI = (state) => {
    aiMessage.classList.remove("typed-out");

    if (sketchController.activeStates.includes(state)) {
        // AI is "thinking"
        actionControls.forEach((elem) => {
            elem.classList.add("inactive-action");
            elem.classList.remove("active");
        });

        // AI Active
        stopButton.classList.remove("inactive-action");
        stopButton.style.background = "#ff6060";
        stopButton.style.color = "#ffffff";
        document.getElementById("stop-icon").classList.add("fa-stop");
        document.getElementById("stop-icon").classList.remove("fa-repeat");
        document.getElementById("stop-icon").style.color = "#ffffff";
        stopButton.querySelector("p").innerHTML = "Stop";

        prompt.style.display = "none";

        document.getElementById("spinner").style.display = "flex";
        if (state == "drawing") {
            aiMessage.innerHTML = `Got it! Drawing ${sketchController.prompt}!`;
            document.getElementById("draw").classList.add("active");
        } else if (state == "refining") {
            aiMessage.innerHTML = `Okay, refining the lines for ${sketchController.prompt}...`;
            document.getElementById("refine").classList.add("active");
        } else if (state == "redrawing") {
            aiMessage.innerHTML = `No worries, how about this instead?`;
            document.getElementById("redraw").classList.add("active");
        } else if (state == "generating") {
            aiMessage.innerHTML = `Sure! Adding ${sketchController.prompt} to the moodboard!`;
            actionControls[3].classList.add("active");
        } else if (state == "continuing") {
            aiMessage.innerHTML = `Nice, I'll make that it into ${sketchController.prompt}.`;
        }
        aiMessage.classList.add("typed-out");
    } else if (state === "stop") {
        // AI is stopped
        actionControls.forEach((elem) => {
            elem.classList.remove("inactive-action");
            elem.classList.remove("active");
        });
        stopButton.style.background = "#f3f1ff";
        stopButton.style.color = "#7b66ff";
        document.getElementById("stop-icon").classList.remove("fa-stop");
        document.getElementById("stop-icon").classList.add("fa-repeat");
        document.getElementById("stop-icon").style.color = "#7b66ff";
        document.getElementById("stop-text").innerHTML = "Redraw";

        document.getElementById("spinner").style.display = "none";
        prompt.style.display = "flex";
        aiMessage.innerHTML = "I'm stopping! What can we draw next?";
        aiMessage.classList.add("typed-out");

        // timeKeeper
        document.getElementById("contain-dot").style.display = "flex";
    }
    sketchController.drawState = state;
};

const unpackGroup = () => {
    if (sketchController.transformGroup !== null) {
        // Need to apply the group scale to the paths within the group
        sketchController.transformGroup.applyMatrix = true;
        // how does scaling the group change the path children?
        userLayer.insertChildren(
            sketchController.transformGroup.index,
            sketchController.transformGroup.removeChildren()
        );
        sketchController.transformGroup.remove();
        sketchController.transformGroup = null;
    }
};

const fitToSelection = (items, state) => {
    let bbox = items.reduce((bbox, item) => {
        return !bbox ? item.bounds : bbox.unite(item.bounds);
    }, null);
    // Add stroke width so no overflow over bounds?
    sketchController.boundingBox = new Path.Rectangle(bbox);
    sketchController.boundingBox.strokeColor = "#D2D2D2";
    sketchController.boundingBox.strokeWidth = 2;
    sketchController.boundingBox.data.state = state;
};

const getSelectedPaths = () =>
    userLayer.getItems().filter((path) => path.selected);

const noPrompt = () =>
    sketchController.prompt === "" ||
    sketchController.prompt === null ||
    sketchController.prompt === prompt.getAttribute("placeholder");

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
//     if (sketchController.buttonControlLeft) {
//         console.log(window.innerWidth);
//         buttonPanel.style.left = `${window.innerWidth - buttonPanel.offsetWidth}px`;
//     } else {
//         buttonPanel.style.left = 0;
//     }
//     sketchController.buttonControlLeft = !sketchController.buttonControlLeft;
// };

// dragging moves select elements + ui
const hideSelectUI = (includeTransform = true) => {
    // remove rect
    if (sketchController.boundingBox) {
        sketchController.boundingBox.remove();
        sketchController.boundingBox = null;
    }
    // hide ui
    if (includeTransform) {
        transformControl.style.display = "none";
    }
    deleteHandler.style.display = "none";
    initialiseHandler.style.display = "none";
};

const updateRectBounds = (from, to) => {
    sketchController.boundingBox.bounds = new Rectangle(from, to);
    sketchController.boundingBox.strokeColor = "#D2D2D2";
    sketchController.boundingBox.strokeWidth = 2;
    sketchController.boundingBox.data.state = "resizing";
    updateSelectPosition();
};

const updateSelectPosition = () => {
    let uiOffset = deleteHandler.getBoundingClientRect().height / 2;
    deleteHandler.style.left =
        sketchController.boundingBox.bounds.topRight.x + "px";
    initialiseHandler.style.left =
        sketchController.boundingBox.bounds.topLeft.x + "px";
    deleteHandler.style.top =
        sketchController.boundingBox.bounds.top - uiOffset + "px";
    initialiseHandler.style.top =
        sketchController.boundingBox.bounds.top - uiOffset + "px";
};

const updateSelectUI = () => {
    if (sketchController.boundingBox) {
        deleteHandler.style.display = "block";
        initialiseHandler.style.display = "block";
        transformControl.style.display = "flex";
        updateSelectPosition();
    }
};

const deletePath = () => {
    selected = getSelectedPaths();
    if (selected.length > 0) {
        pathList = selected.map((path) => path.exportJSON()); //dont use paper ref
        console.log(pathList);
        sketchController.stack.undoStack.push({
            type: "delete-event",
            data: pathList,
        });
        selected.map((path) => path.remove());
    }
    if (sketchController.boundingBox) {
        hideSelectUI();
    }
    sketchController.transformGroup = null;

    sketchController.svg = paper.project.exportSVG({
        asString: true,
    });
    logger.event("deleted-path");
};

const showHide = (item) => {
    if (item.style.display == undefined || item.style.display == "none") {
        item.style.display = "flex";
    } else {
        item.style.display = "none";
    }
};

// switchControls();

const parseFromSvg = (svg, layer, showAllPaths = true) => {
    if (svg === "" || svg === undefined) return null;
    let paperObject = layer.importSVG(svg);
    const numPaths = paperObject.children[0].children.length; // drawn on the canvas right now

    for (const returnedIndex in paperObject.children[0].children) {
        const child = paperObject.children[0].children[returnedIndex];
        child.smooth();

        if (sketchController.initRandomCurves && !sketchController.linesDisabled) {
            if (
                returnedIndex >= sketchController.pathsOnCanvas &&
                returnedIndex < numPaths - sketchController.numAddedPaths
            ) {
                child.opacity *= 0.7;
            }
        }

        const pathEffect = child.clone({ insert: false });

        if (!showAllPaths) {
            if (returnedIndex < sketchController.showAICurves) {
                layer.addChild(pathEffect);
            }
        } else {
            layer.addChild(pathEffect);
        }

        // layer.addChild(pathEffect);
    }
    paperObject.remove();
    return paperObject;
};

const getHistoryBatch = (maxSize, startIdx) => {
    let len = sketchController.stack.historyHolder.length;
    if (len <= 1) return null;
    let traceList = [];
    let batchSize = Math.min(maxSize, startIdx); // not first item
    // num traces
    for (let i = 0; i < batchSize; i++) {
        traceList.push(sketchController.stack.historyHolder[startIdx - i - 1]);
    }
    return traceList;
};

// update because loss varies a lot??
const calcRollingLoss = () => {
    const items = getHistoryBatch(
        setTraces.value,
        sketchController.stack.historyHolder.length - 1
    );
    if (items) {
        const sum = items.reduce(
            (partialSum, historyItem) => partialSum + historyItem.loss,
            0
        );
        const newRollingLoss = sum / items.length;
        // if (sketchController.lastRollingLoss !== undefined) {
        //     if (Math.abs(sketchController.lastRollingLoss - newRollingLoss) < 0.0001) {
        //         lossText.innerHTML = `Converged at: ${newRollingLoss}`;
        //         stopClip();
        //     }
        // }
        sketchController.lastRollingLoss = newRollingLoss;
    }
};

const showTraceHistoryFrom = (fromIndex) => {
    const items = getHistoryBatch(sketchController.numTraces, fromIndex);
    if (items) {
        sketchController.traces = null;
        let refList = [];
        for (let pastGen of items) {
            userLayer.importSVG(pastGen.svg);
            refList.push(parseFromSvg(pastGen.svg, userLayer));
        }
        sketchController.traces = refList;
    }
};

ws.onmessage = function(event) {
    try {
        var result = JSON.parse(event.data);
    } catch (e) {
        console.log("Unexpected JSON event\n", e);
        sketchController.clipDrawing = false;
    }

    if (sketchController.clipDrawing) {
        if (result.status === "stop") {
            console.log("WHYYYYYY");
            console.log("Stopped drawer");
            sketchController.clipDrawing = false;
        }

        if (result.status === "draw") {
            //sketch

            if (sketchController.isFirstIteration) {
                userLayer.clear();
                sketchController.isFirstIteration = false;
            } else {
                // Delete ref to last gen and old sketchController.traces
                if (sketchController.lastRender) {
                    sketchController.lastRender.remove();
                }
                if (sketchController.traces) {
                    for (const trace of sketchController.traces) {
                        trace.remove();
                    }
                }
            }

            sketchController.stack.historyHolder.push({
                ...result,
                svg: sketchController.svg, //only use canvas paths at that point
            });
            timeKeeper.style.width = "100%";
            timeKeeper.setAttribute("max", String(sketchController.step + 1));
            timeKeeper.value = String(sketchController.step + 1);
            setTraces.setAttribute("max", String(sketchController.step + 1));
            sketchController.step += 1; //avoid disconnected iteration after stopping

            // To do change this so it is just max num sketchController.traces
            if (sketchController.numTraces > 1) {
                userLayer.clear();
                showTraceHistoryFrom(sketchController.stack.historyHolder.length - 1);
            } else {
                userLayer.clear();
                if (sketchController.showAICurves < sketchController.numRandomCurves) {
                    sketchController.showAICurves += Math.floor(
                        Math.random() * sketchController.randomRange
                    );
                }
                sketchController.lastRender = parseFromSvg(
                    result.svg,
                    userLayer,
                    sketchController.showAllLines
                );
                sketchController.svg = paper.project.exportSVG({
                    asString: true,
                });
            }

            calcRollingLoss();
            lossText.innerHTML = `Step: ${
        sketchController.step
      }\nLoss: ${sketchController.lastRollingLoss.toPrecision(5)}`;

            console.log(
                `Draw iteration: ${result.iterations} \nLoss value: ${result.loss}`
            );
        }

        var matches = result.status.match(/\d+/g); //if status is a num
        if (matches != null) {
            if (result.svg === "") return null;

            let thisCanvas = exemplarScope.projects[result.sketch_index];
            console.log(result.sketch_index);
            console.log(result);
            thisCanvas.clear();
            let imported = parseFromSvg(
                result.svg,
                thisCanvas.activeLayer,
                sketchController.showAllLines
            );
        }
    }
};

const createExemplar = (isUserSketch, sketchCountIndex = null) => {
    let type = isUserSketch ? "U" : "AI";

    let newElem = exemplarTemplate.cloneNode(reusableExemplar);
    newElem.style.visibility = "initial";

    let exemplarCanvas = newElem.querySelector("canvas");
    exemplarCanvas.width = exemplarSize;
    exemplarCanvas.height = exemplarSize;

    if (sketchCountIndex !== null) {
        let removeButton = newElem.querySelector(".fa-minus");
        let stopButton = newElem.querySelector(".fa-stop");

        exemplarScope.setup(exemplarCanvas);
        newElem.id = `${type}-sketch-item-${sketchCountIndex}`;
        exemplarCanvas.id = `${type}-sketch-canvas-${sketchCountIndex}`;
        newElem.querySelector("h3").innerHTML = `${type}${sketchCountIndex}`;

        if (isUserSketch) {
            stopButton.style.display = "none";
            removeButton.addEventListener("click", () => {
                newElem.remove();
            });
        } else {
            stopButton.addEventListener("click", () => {
                sketchController.stopSingle(sketchCountIndex);
            });
            removeButton.addEventListener("click", () => {
                newElem.classList.add("inactive-exemplar");
                sketchController.stopSingle(sketchCountIndex);
            });
        }

        exemplarCanvas.addEventListener("click", () => {
            // open dialog for clone vs copy?
            importToSketch(sketchCountIndex);
            // make a copy to the current canvas
            document.getElementById("contain-dot").style.display = "none";
        });

        // Make draggable
        newElem.addEventListener(
            "dragstart",
            function(e) {
                e.dataTransfer.setData("text/plain", sketchCountIndex);
                sketchContainer.classList.remove("canvas-standard-drop");
                sketchContainer.classList.add("canvas-hover-light");
                if (!isUserSketch) {
                    staticSketches.classList.add("canvas-hover-light");
                }
            },
            false
        );
        newElem.addEventListener("dragend", function(e) {
            sketchContainer.classList.add("canvas-standard-drop");
            sketchContainer.classList.remove("canvas-hover-light");
            if (!isUserSketch) {
                staticSketches.classList.remove("canvas-hover-light");
            }
        });
    } else {
        // is default ui
        newElem.id = `default-sketch-item`;
        exemplarCanvas.id = `default-canvas`;
    }

    return newElem;
};

const setPenMode = (mode, accentTarget) => {
    let lastPenMode = sketchController.penMode;
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
            console.log(sketchController.penDropMode);

            setPenMode(sketchController.penDropMode, accentTarget);
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
            penDrop.classList.remove("fa-pen");
            penDrop.classList.add("fa-eraser");
            eraseTool.activate();
            sketchController.penMode = mode;
            sketchController.penDropMode = mode;
            break;
        case "pen":
            penDrop.classList.remove("fa-eraser");
            penDrop.classList.add("fa-pen");
            multiTool.activate();
            sketchController.penMode = mode;
            sketchController.penDropMode = mode;
            "pen";
            break;
        case "select":
            dropdown.style.display = "none";
            multiTool.activate();
            sketchController.penMode = mode;
            break;
        case "lasso":
            multiTool.activate();
            if (noPrompt()) {
                sketchController.penMode = lastPenMode;
                openModal({
                    title: "Add a prompt first!",
                    message: "You need a prompt to generate sketches with the region tool.",
                });
            } else {
                sketchController.penMode = mode;
            }
            break;
    }

    if (sketchController.penMode !== "select") {
        userLayer.getItems().forEach((path) => {
            path.selected = false;
        });
        hideSelectUI();
    }
    if (
        sketchController.penMode !== "lasso" &&
        sketchController.penMode !== "select"
    ) {
        sketchController.drawRegion = undefined;
        if (regionPath) regionPath.remove();
    }
};

const getRGBA = () => {
    let rgba = sketchController.strokeColor.replace(/[^\d,]/g, "").split(",");
    rgba[3] = sketchController.opacity;
    let col = `rgba(${rgba.join()})`;
    console.log(col);
    document.getElementById("pen-color").style.background = col;
    document.getElementById("point-size").style.background = col;
};