const importStaticSketch = (i) => {
    if (allowOverwrite) {
        openModal({
            title: "Overwriting Canvas",
            message: "Import into the main canvas? Contents will be saved.",
            confirmAction: () => {
                pauseActiveDrawer();
                saveSketch(); //make copy
                importToSketch(i, true);
            },
        });
    } else {
        pauseActiveDrawer();
        saveSketch(); //make copy
        importToSketch(i, false);
    }
};

const importToSketch = (exemplarIndex, clear) => {
    console.log("IMPORTING");
    let copy = exemplarScope.projects[exemplarIndex].activeLayer.clone();
    let expandedExemplar = copy.scale(scaleRatio);
    if (clear) {
        userLayer.clear();
        var newSketch = userLayer.addChild(expandedExemplar);
        newSketch.getItems((path) => (path.strokeWidth *= scaleRatio));
    } else {
        var newSketch = userLayer.addChild(expandedExemplar);
        newSketch.getItems((path) => {
            path.strokeWidth *= scaleRatio;
            path.opacity *= 0.5;
        });
    }
    newSketch.position = new Point(
        sketchController.frameSize / 2,
        sketchController.frameSize / 2
    );
    newSketch.getItems((path) =>
        userLayer.addChild(path.clone({ insert: true }))
    );
    newSketch.remove();
};

const exportToExemplar = () => {
    console.log("EXPORTING");
    unpackGroup();
    userLayer.getItems().forEach((path) => {
        path.selected = false;
    });
    sketchController.transformGroup = null;
    if (sketchController.boundingBox) {
        hideSelectUI();
    }

    let scaledSketch = userLayer.clone({ insert: false });
    scaledSketch.scale(1 / scaleRatio);
    scaledSketch.getItems((item) => (item.strokeWidth /= scaleRatio));
    let result = scaledSketch.exportJSON();
    scaledSketch.remove();
    return result;
};

const exploreToStatic = (i) => {
    console.log("EXPORTING");
    console.log(exemplarScope.projects[i]);
    let saveSketch = exemplarScope.projects[i].activeLayer.clone({
        insert: false,
    });
    saveSketch.getItems().forEach((path) => {
        path.selected = false;
    });
    return saveSketch.exportJSON();
};

const saveSketch = (fromSketch = null) => {
    let jsonGroup;
    if (fromSketch !== null) {
        jsonGroup = exploreToStatic(fromSketch);
    } else {
        jsonGroup = exportToExemplar();
    }
    let sketchCountIndex = sketchController.sketchScopeIndex;
    let newElem = createExemplar(exemplarScope, true, sketchCountIndex);
    let toCanvas = exemplarScope.projects[sketchCountIndex];
    let imported = toCanvas.activeLayer.importJSON(jsonGroup);
    imported.position = new Point(exemplarSize / 2, exemplarSize / 2);

    newElem.classList.add("bounce");
    document.getElementById("exemplar-grid").prepend(newElem);
    sketchController.sketchScopeIndex += 1;
};

const setActionUI = (state) => {
    let lastDrawState = sketchController.drawState;
    aiMessage.classList.remove("typed-out");

    if (state == "pruning") {
        aiMessage.classList.remove("typed-out");
        aiMessage.innerHTML = "Just a moment while I tidy up!";
        aiMessage.classList.add("typed-out");
        canvas.classList.add("loading-canvas");
        document.getElementById("history-block").style.display = "none";
        actionControls.forEach((elem) => {
            elem.classList.add("inactive-action");
            elem.classList.remove("active");
        });
    }

    if (sketchController.activeStates.includes(state)) {
        // AI Active

        actionControls.forEach((elem) => {
            elem.classList.add("inactive-action");
            elem.classList.remove("active");
        });

        stopButton.classList.remove("inactive-action");
        stopButton.style.background = "#ff6060";
        stopButton.style.color = "#ffffff";
        stopButton.querySelector("i").style.color = "#ffffff";

        document.getElementById("lasso").classList.add("inactive-top-action");
        document.getElementById("undo").classList.add("inactive-top-action");
        document.getElementById("redo").classList.add("inactive-top-action");

        promptInput.style.display = "none";
        document.getElementById("add-refine").style.display = "block";
        document.getElementById("spinner").style.display = "flex";

        // document.getElementById("respect-block").classList.add("inactive-section");

        if (state == "drawing") {
            aiMessage.innerHTML = `Got it! Drawing ${sketchController.prompt}!`;
            document.getElementById("draw").classList.add("active");
        } else if (state == "brainstorming-exemplars") {
            aiMessage.innerHTML = `I've got some ideas for ${sketchController.prompt}!`;
            document.getElementById("draw").classList.add("active");
        } else if (state == "refining") {
            aiMessage.innerHTML = `Okay, refining the lines for ${sketchController.prompt}...`;
            document.getElementById("refine").classList.add("active");
        }
        // else if (state == "redrawing") {
        //     aiMessage.innerHTML = `No worries, how about this instead?`;
        //     document.getElementById("redraw").classList.add("active");
        //     // } else if (state == "generating") {
        //     //     aiMessage.innerHTML = `Sure! Adding ${sketchController.prompt} to the moodboard!`;
        //     //     actionControls[3].classList.add("active");
        // }
        else if (state == "continuing") {
            aiMessage.innerHTML = `Nice, I'll make that it into ${sketchController.prompt}.`;
        }
        aiMessage.classList.add("typed-out");
    } else if (state === "stop") {
        canvas.classList.remove("loading-canvas");

        // Loop through brainstorm and stop each of them
        explorer.childNodes.forEach((child, i) => {
            let stopButton = child.querySelector(".fa-stop");
            let loader = child.querySelector(".card-loading");

            loader.classList.remove("button-animation");
            loader.classList.remove("fa-spinner");
            loader.classList.add("fa-check");
            stopButton.style.background = "#f5f5f5";
            stopButton.style.background = "#d2d2d2";
            sketchController.stopSingle(sketchController.scopeRef[i]);
        });

        // AI is stopped
        actionControls.forEach((elem) => {
            elem.classList.remove("inactive-action");
            elem.classList.remove("active");
        });
        stopButton.style.background = "#f3f1ff";
        stopButton.style.color = "#7b66ff";
        // document.getElementById("stop-icon").classList.remove("fa-stop");
        // document.getElementById("stop-icon").classList.add("fa-repeat");
        stopButton.querySelector("i").style.color = "#7b66ff";
        // document.getElementById("stop-text").innerHTML = "Redraw";

        document.getElementById("spinner").style.display = "none";
        promptInput.style.display = "flex";
        document.getElementById("add-refine").style.display = "none";
        aiMessage.innerHTML = "All done! What should we draw next?";
        aiMessage.classList.add("typed-out");

        // document
        //     .getElementById("respect-block")
        //     .classList.remove("inactive-section");
        document.getElementById("lasso").classList.remove("inactive-top-action");
        document.getElementById("undo").classList.remove("inactive-top-action");
        document.getElementById("redo").classList.remove("inactive-top-action");

        // timeKeeper
        if (
            lastDrawState !== "brainstorming-exemplars" &&
            sketchController.stack.historyHolder.length > 1 //first elem empty
        ) {
            document.getElementById("history-block").style.display = "flex";
        }
    } else if (state === "stopSingle") {
        aiMessage.innerHTML = `Stopped a single sketch!`;
        aiMessage.classList.add("typed-out");
    }
    sketchController.drawState = state;
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

const setPointSize = (s) => {
    const point = document.getElementById("point-size");
    sketchController.strokeWidth = s;
    point.style.width = sketchController.strokeWidth + "px";
    point.style.height = sketchController.strokeWidth + "px";
    getSelectedPaths().forEach(
        (item) => (item.strokeWidth = sketchController.strokeWidth)
    );
};

const unpackGroup = () => {
    if (sketchController.transformGroup !== null) {
        sketchController.transformGroup.applyMatrix = true; // apply group rotation/scale to children on unpack
        userLayer.insertChildren(
            sketchController.transformGroup.index,
            sketchController.transformGroup.removeChildren()
        );
    }
};

const fitToSelection = (items, state) => {
    let bbox = items.reduce((bbox, item) => {
        return !bbox ? item.bounds : bbox.unite(item.bounds);
    }, null);
    // Add stroke width so no overflow over bounds?
    sketchController.boundingBox = new Path.Rectangle(bbox);
    sketchController.boundingBox.sendToBack();
    sketchController.boundingBox.set({
        fillColor: "#f5f5f5",
        opacity: 0.4,
        strokeColor: "#7b66ff",
        strokeWidth: 2,
    });
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
    document.getElementById("confirm-modal").onclick = () => {
        confirm();
        close();
    };
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
    // initialiseHandler.style.display = "none";
    // reviseHandler.style.display = "none";
    copyHandler.style.display = "none";
};

const updateRectBounds = (from, to) => {
    sketchController.boundingBox.bounds = new Rectangle(from, to);
    sketchController.boundingBox.bounds.set({
        fillColor: "#f5f5f5",
        opacity: 0.4,
        strokeColor: "#7b66ff",
        strokeWidth: 2,
    });
    sketchController.boundingBox.data.state = "resizing";
    updateSelectPosition();
};

const updateSelectPosition = () => {
    let uiOffset = deleteHandler.getBoundingClientRect().height / 2 + 5;
    deleteHandler.style.left =
        sketchController.boundingBox.bounds.topRight.x + "px";
    // reviseHandler.style.left =
    //     sketchController.boundingBox.bounds.topLeft.x + "px";
    deleteHandler.style.top =
        sketchController.boundingBox.bounds.top - uiOffset + "px";
    // reviseHandler.style.top =
    //     sketchController.boundingBox.bounds.top - uiOffset + "px";

    // initialiseHandler.style.left =
    //     sketchController.boundingBox.bounds.topRight.x + "px";
    copyHandler.style.left = sketchController.boundingBox.bounds.topLeft.x + "px";
    // initialiseHandler.style.top =
    //     sketchController.boundingBox.bounds.bottom + uiOffset + "px";
    copyHandler.style.top =
        sketchController.boundingBox.bounds.bottom + uiOffset + "px";
};

const updateSelectUI = () => {
    if (sketchController.boundingBox && getSelectedPaths().length) {
        deleteHandler.style.display = "block";
        // initialiseHandler.style.display = "block";
        // reviseHandler.style.display = "block";
        copyHandler.style.display = "block";
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

        // TO DO FIX
        sketchController.userPaths = sketchController.userPaths.filter(
            (ref) => ref !== path
        ); //remove ref
        selected.map((path) => path.remove()); // remove from sketch
    }
    if (sketchController.boundingBox) {
        hideSelectUI();
    }
    sketchController.transformGroup = null;

    sketchController.svg = paper.project.exportSVG({
        asString: true,
    });

    if (liveCollab) {
        sketchController.continueSketch();
        liveCollab = false;
    }
    console.log(sketchController.userPaths);
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
    // to do check children exist
    const numPaths = paperObject.children[0].children.length; // drawn on the canvas right now
    const numUserPaths = sketchController.userPaths.length;

    const sentUserPaths = sketchController.userPaths;
    sketchController.userPaths = [];

    for (const returnedIndex in paperObject.children[0].children) {
        const child = paperObject.children[0].children[returnedIndex];
        child.smooth();

        if (sketchController.initRandomCurves && !sketchController.linesDisabled) {
            if (returnedIndex >= numUserPaths) {
                child.opacity *= 0.5;
            }
        }

        const pathEffect = child.clone({ insert: false });

        if (!showAllPaths) {
            if (returnedIndex < numUserPaths) {
                layer.addChild(pathEffect);
            }
        } else {
            // Add all
            let added = layer.addChild(pathEffect);
            if (returnedIndex < numUserPaths) {
                sketchController.userPaths.push(added);
            }
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
        console.log(event);
        sketchController.clipDrawing = false;
    }

    if (sketchController.clipDrawing) {
        if (event.data !== "") {
            if (result.status === "stop") {
                console.log("WHYYYYYY");
                sketchController.clipDrawing = false;
            }

            if (result.status === "draw") {
                console.log("DRAWING: ", result);
                userLayer.clear();

                if (sketchController.isFirstIteration) {
                    userLayer.clear();
                    sketchController.isFirstIteration = false;
                } else {
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
                    showTraceHistoryFrom(sketchController.stack.historyHolder.length - 1);
                } else {
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

                lossText.innerHTML = `Step: ${sketchController.step}\nLoss: 
                ${sketchController.lastRollingLoss.toPrecision(5)}`;

                console.log(
                    `Draw iteration: ${result.iterations} \nLoss value: ${result.loss}. Drawn ${sketchController.step}`
                );

                if (sketchController.drawState == "pruning") {
                    sketchController.clipDrawing = false;
                    setActionUI("stop");
                }
            }

            var matches = result.status.match(/\d+/g); //if status is a num
            if (matches != null) {
                if (result.svg === "") return null;
                userLayer.clear();

                let thisCanvas = exemplarScope.projects[result.sketch_index];

                console.log(result.sketch_index);
                thisCanvas.clear();
                let imported = parseFromSvg(
                    result.svg,
                    thisCanvas.activeLayer
                    // sketchController.showAllLines
                );
            }
        }
    }
};

const createExemplar = (scope, isUserSketch, sketchCountIndex = null) => {
    let type = isUserSketch ? "U" : "AI";

    let newElem = exemplarTemplate.cloneNode(reusableExemplar);
    newElem.style.visibility = "initial";

    let exemplarCanvas = newElem.querySelector("canvas");
    exemplarCanvas.width = exemplarSize;
    exemplarCanvas.height = exemplarSize;
    scope.setup(exemplarCanvas);

    if (sketchCountIndex !== null) {
        let removeButton = newElem.querySelector(".fa-minus");
        let stopButton = newElem.querySelector(".fa-stop");
        let loader = newElem.querySelector(".card-loading");

        newElem.id = `${type}-sketch-item-${sketchCountIndex}`;
        exemplarCanvas.id = `${type}-sketch-canvas-${sketchCountIndex}`;
        newElem.querySelector("h3").innerHTML = `${type}${sketchCountIndex}`;

        // scope.setup(exemplarCanvas);

        if (isUserSketch) {
            stopButton.style.display = "none";
            loader.style.display = "none";
            removeButton.addEventListener("click", () => {
                newElem.remove();
            });
        } else {
            stopButton.addEventListener("click", () => {
                loader.classList.remove("button-animation");
                loader.classList.remove("fa-spinner");
                loader.classList.add("fa-check");
                stopButton.style.background = "#f5f5f5";
                stopButton.style.background = "#d2d2d2";

                sketchController.stopSingle(sketchCountIndex);
            });
            removeButton.addEventListener("click", () => {
                newElem.classList.add("inactive-exemplar");
                sketchController.stopSingle(sketchCountIndex);
            });
        }

        exemplarCanvas.addEventListener("click", () => {
            importStaticSketch(sketchCountIndex);
            document.getElementById("history-block").style.display = "none";
        });

        // Make draggable
        newElem.addEventListener(
            "dragstart",
            function(e) {
                e.dataTransfer.setData("text/plain", sketchCountIndex);
                // sketchContainer.classList.remove("canvas-standard-drop");
                // sketchContainer.classList.add("canvas-hover-light");
                // if (!isUserSketch) {
                //     staticSketches.classList.add("canvas-hover-light");
                // }
            },
            false
        );
        newElem.addEventListener("dragend", function(e) {
            // sketchContainer.classList.add("canvas-standard-drop");
            // sketchContainer.classList.remove("canvas-hover-light");
            // if (!isUserSketch) {
            //     staticSketches.classList.remove("canvas-hover-light");
            // }
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
            // setPenMode(sketchController.penDropMode, accentTarget);
            if (dropdown.style.display === "none" || !dropdown.style.display) {
                dropdown.style.display = "flex";
                dropdown.style.top = buttonPanel.getBoundingClientRect().bottom + "px";
                dropdown.style.left =
                    penDrop.getBoundingClientRect().left +
                    penDrop.getBoundingClientRect().width / 2 +
                    "px";
                if (sketchController.penMode === "select") {
                    document.getElementById("select").classList.add("selected-mode");
                }
                if (sketchController.penMode === "select") {
                    document.getElementById("lasso");
                    document.getElementById("select").classList.add("selected-mode");
                }
            } else {
                dropdown.style.display = "none";
            }
            break;
        case "erase":
            dropdown.style.display = "none";
            eraseTool.activate();
            sketchController.penMode = mode;
            break;
        case "pen":
            dropdown.style.display = "none";
            multiTool.activate();
            sketchController.penMode = mode;
            "pen";
            break;
        case "select":
            penDrop.classList.add("selected-mode");
            penDrop.classList.remove("fa-eraser");
            penDrop.classList.remove("fa-object-group");
            penDrop.classList.add("fa-arrow-pointer");
            multiTool.activate();
            sketchController.penMode = mode;
            sketchController.penDropMode = mode;
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
                penDrop.classList.add("selected-mode");
                penDrop.classList.remove("fa-eraser");
                penDrop.classList.remove("fa-arrow-pointer");
                penDrop.classList.add("fa-object-group");
                sketchController.penMode = mode;
                sketchController.penDropMode = mode;
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
        penDrop.classList.remove("selected-mode");
    }
};

const getRGBA = () => {
    let rgba = sketchController.strokeColor.replace(/[^\d,]/g, "").split(",");
    rgba[3] = sketchController.opacity;
    return `rgba(${rgba.join()})`;
};

const setLineLabels = (maxLines) => {
    let res = maxLines - userLayer.children.length;
    sketchController.numAddedCurves = res > 0 ? res : 0;
    document.getElementById("max-lines").innerHTML = `Max lines : ${maxLines}`;
    document.getElementById(
        "calc-lines"
    ).innerHTML = `Adding : ${sketchController.numAddedCurves}`;
};