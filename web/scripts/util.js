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