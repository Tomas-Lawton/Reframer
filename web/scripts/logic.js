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
        mainSketch.frameSize / 2,
        mainSketch.frameSize / 2
    );

    mainSketch.svg = paper.project.exportSVG({
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

    if (mainSketch.activeStates.includes(state)) {
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
            aiMessage.innerHTML = `Got it! Drawing ${mainSketch.prompt}!`;
            document.getElementById("draw").classList.add("active");
        } else if (state == "refining") {
            aiMessage.innerHTML = `Okay, refining the lines for ${mainSketch.prompt}...`;
            document.getElementById("refine").classList.add("active");
        } else if (state == "redrawing") {
            aiMessage.innerHTML = `No worries, how about this instead?`;
            document.getElementById("redraw").classList.add("active");
        } else if (state == "generating") {
            aiMessage.innerHTML = `Sure! Adding ${mainSketch.prompt} to the moodboard!`;
            actionControls[3].classList.add("active");
        } else if (state == "continuing") {
            aiMessage.innerHTML = `Nice, I'll make that it into ${mainSketch.prompt}.`;
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

    mainSketch.svg = paper.project.exportSVG({
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

const parseFromSvg = (svg, layer, showAllPaths = false) => {
    if (svg === "" || svg === undefined) return null;
    let paperObject = layer.importSVG(svg);
    const numPaths = paperObject.children[0].children.length; // drawn on the canvas right now

    for (const returnedIndex in paperObject.children[0].children) {
        const child = paperObject.children[0].children[returnedIndex];
        child.smooth();

        if (mainSketch.initRandomCurves && !mainSketch.linesDisabled) {
            if (
                returnedIndex >= mainSketch.pathsOnCanvas &&
                returnedIndex < numPaths - mainSketch.numAddedPaths
            ) {
                child.opacity *= 0.7;
            }
        }

        const pathEffect = child.clone({ insert: false });

        // if (!showAllPaths) {
        //     if (returnedIndex < mainSketch.showAICurves) {
        //         layer.addChild(pathEffect);
        //     }
        // } else {
        //     layer.addChild(pathEffect);
        // }

        layer.addChild(pathEffect);
    }
    paperObject.remove();
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
            refList.push(parseFromSvg(pastGen.svg, userLayer));
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
            timeKeeper.setAttribute("max", String(mainSketch.step + 1));
            timeKeeper.value = String(mainSketch.step + 1);
            setTraces.setAttribute("max", String(mainSketch.step + 1));
            mainSketch.step += 1; //avoid disconnected iteration after stopping

            // To do change this so it is just max num mainSketch.traces
            if (mainSketch.numTraces > 1) {
                userLayer.clear();
                showTraceHistoryFrom(mainSketch.stack.historyHolder.length - 1);
            } else {
                userLayer.clear();
                if (mainSketch.showAICurves < mainSketch.numRandomCurves) {
                    mainSketch.showAICurves += Math.floor(
                        Math.random() * mainSketch.randomRange
                    );
                }
                mainSketch.lastRender = parseFromSvg(result.svg, userLayer);
                mainSketch.svg = paper.project.exportSVG({
                    asString: true,
                });
            }

            calcRollingLoss();
            lossText.innerHTML = `Step: ${
        mainSketch.step
      }\nLoss: ${mainSketch.lastRollingLoss.toPrecision(5)}`;

            console.log(
                `Draw iteration: ${result.iterations} \nLoss value: ${result.loss}`
            );
        }

        var matches = result.status.match(/\d+/g); //if status is a num
        if (matches != null) {
            if (result.svg === "") return null;

            let thisCanvas = exemplarScope.projects[result.exemplar_index];
            console.log(result.exemplar_index);
            console.log(result);
            thisCanvas.clear();
            let imported = parseFromSvg(result.svg, thisCanvas.activeLayer, true);
        }
    }
};

const createExemplar = (isUserSketch, creationIndex = null) => {
    let type = isUserSketch ? "U" : "AI";

    let newElem = exemplarTemplate.cloneNode(reusableExemplar);
    newElem.style.visibility = "initial";

    let exemplarCanvas = newElem.querySelector("canvas");
    exemplarCanvas.width = exemplarSize;
    exemplarCanvas.height = exemplarSize;

    if (creationIndex !== null) {
        let removeButton = newElem.querySelector(".card-icon-background");
        let stopButton = newElem.querySelector(".fa-stop");

        exemplarScope.setup(exemplarCanvas);
        newElem.id = `${type}-sketch-item-${creationIndex}`;
        exemplarCanvas.id = `${type}-sketch-canvas-${creationIndex}`;
        newElem.querySelector("h3").innerHTML = `${type}${creationIndex}`;

        if (isUserSketch) {
            stopButton.style.display = "none";
            removeButton.addEventListener("click", () => {
                newElem.remove();
            });
        } else {
            stopButton.addEventListener("click", () => {
                // stop specific exemplar index
            });
            removeButton.addEventListener("click", () => {
                // if an AI exemplar is deleted -> this will remove it from backend drawers !!!!!! add to creating exemplar function !!!
                newElem.classList.add("inactive-exemplar");
            });
        }

        exemplarCanvas.addEventListener("click", () => {
            // open dialog for clone vs copy?
            importToSketch(creationIndex);
            // make a copy to the current canvas
            document.getElementById("contain-dot").style.display = "none";
        });

        // Make draggable
        newElem.addEventListener(
            "dragstart",
            function(e) {
                e.dataTransfer.setData("text/plain", creationIndex);
                sketchContainer.classList.remove("canvas-standard-drop");
                sketchContainer.classList.add("canvas-hover-light");
            },
            false
        );
        newElem.addEventListener("dragend", function(e) {
            sketchContainer.classList.add("canvas-standard-drop");
            sketchContainer.classList.remove("canvas-hover-light");
        });
    } else {
        // is default ui
        newElem.id = `default-sketch-item`;
        exemplarCanvas.id = `default-canvas`;
    }

    return newElem;
};

// const createExemplar = (isUserSketch, creationIndex = null) => {
//     let type = isUserSketch ? "U" : "AI";

//     let newElem = exemplarTemplate.cloneNode(reusableExemplar);
//     newElem.style.visibility = "initial";

//     let exemplarCanvas = newElem.querySelector("canvas");
//     let removeButton = newElem.querySelector(".card-icon-background");
//     let stopButton = newElem.querySelector(".fa-stop");

//     exemplarCanvas.width = exemplarSize;
//     exemplarCanvas.height = exemplarSize;
//     exemplarScope.setup(exemplarCanvas);

//     newElem.id = `${type}-sketch-item-${creationIndex}`;
//     exemplarCanvas.id = `${type}-sketch-canvas-${creationIndex}`;
//     newElem.querySelector("h3").innerHTML = `${type}${creationIndex}`;

//     if (isUserSketch) {
//         // index can be anything, exemplar count increases
//         stopButton.style.display = "none";
//         removeButton.addEventListener("click", () => {
//             newElem.remove();
//         });
//     } else {
//         // drawing index should be 0-3.

//         stopButton.addEventListener("click", () => {
//             // stop specific exemplar index
//         });
//         removeButton.addEventListener("click", () => {
//             // AND ALSO // stop specific exemplar index
//             // if an AI exemplar is deleted -> this will remove it from backend drawers !!!!!! add to creating exemplar function !!!

//             newElem.classList.add("inactive-exemplar");
//         });
//     }

//     exemplarCanvas.addEventListener("click", () => {
//         // open dialog for clone vs copy?
//         importToSketch(creationIndex);
//         // make a copy of the current canvas
//         document.getElementById("contain-dot").style.display = "none";
//     });

//     // Make draggable
//     newElem.addEventListener(
//         "dragstart",
//         function(e) {
//             e.dataTransfer.setData("text/plain", creationIndex);
//             sketchContainer.classList.remove("canvas-standard-drop");
//             sketchContainer.classList.add("canvas-hover-light");
//         },
//         false
//     );
//     newElem.addEventListener("dragend", function(e) {
//         sketchContainer.classList.add("canvas-standard-drop");
//         sketchContainer.classList.remove("canvas-hover-light");
//     });
//     return newElem;
// };

const setPenMode = (mode, accentTarget) => {
    let lastPenMode = mainSketch.penMode;
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
            console.log(mainSketch.penDropMode);

            setPenMode(mainSketch.penDropMode, accentTarget);
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
            mainSketch.penMode = mode;
            mainSketch.penDropMode = mode;
            break;
        case "pen":
            penDrop.classList.remove("fa-eraser");
            penDrop.classList.add("fa-pen");
            multiTool.activate();
            mainSketch.penMode = mode;
            mainSketch.penDropMode = mode;
            "pen";
            break;
        case "select":
            dropdown.style.display = "none";
            multiTool.activate();
            mainSketch.penMode = mode;
            break;
        case "lasso":
            multiTool.activate();
            if (noPrompt()) {
                mainSketch.penMode = lastPenMode;
                openModal({
                    title: "Add a prompt first!",
                    message: "You need a prompt to generate sketches with the region tool.",
                });
            } else {
                mainSketch.penMode = mode;
            }
            break;
    }

    if (mainSketch.penMode !== "select") {
        userLayer.getItems().forEach((path) => {
            path.selected = false;
        });
        hideSelectUI();
    }
    if (mainSketch.penMode !== "lasso" && mainSketch.penMode !== "select") {
        mainSketch.drawRegion = undefined;
        if (regionPath) regionPath.remove();
    }
};

const getRGBA = () => {
    let rgba = mainSketch.strokeColor.replace(/[^\d,]/g, "").split(",");
    rgba[3] = mainSketch.opacity;
    let col = `rgba(${rgba.join()})`;
    console.log(col);
    document.getElementById("pen-color").style.background = col;
    document.getElementById("point-size").style.background = col;
};