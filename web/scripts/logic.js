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
    switch (state) {
        case "inactive":
            actionControls.forEach((elem) => elem.classList.add("inactive-action"));
            //draw or exemplar
            actionControls[0].classList.remove("inactive-action");
            actionControls[1].classList.remove("inactive-action");
            break;
        case "active":
            actionControls.forEach((elem) => elem.classList.add("inactive-action"));
            actionControls[0].classList.add("inactive-action");
            actionControls[1].classList.add("inactive-action");
            // stop
            actionControls[4].classList.remove("inactive-action");
            actionControls[4].style.background = "#ff6060";
            break;
        case "stop":
            // all possible
            actionControls.forEach((elem) =>
                elem.classList.remove("inactive-action")
            );
            actionControls[4].style.background = "#e1e1e1";
            break;
    }
    mainSketch.drawState = state;
};

const unpackGroup = () => {
    if (mainSketch.rotationGroup !== null) {
        mainSketch.rotationGroup.applyMatrix = true;
        userLayer.insertChildren(
            mainSketch.rotationGroup.index,
            mainSketch.rotationGroup.removeChildren()
        );
        mainSketch.rotationGroup.remove();
        mainSketch.rotationGroup = null;
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
    let rect = palette.getBoundingClientRect();
    artControls.style.right = `${rect.width / 2}px`;
    artControls.style.top = `${rect.bottom - rect.height / 2}px`;
    if (!artControls.style.display || artControls.style.display === "none") {
        artControls.style.display = "block";
    } else {
        artControls.style.display = "none";
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

const switchControls = () => {
    if (mainSketch.buttonControlLeft) {
        console.log(window.innerWidth);
        buttonPanel.style.left = `${window.innerWidth - buttonPanel.offsetWidth}px`;
    } else {
        buttonPanel.style.left = 0;
    }
    mainSketch.buttonControlLeft = !mainSketch.buttonControlLeft;
};

// dragging moves select elements + ui
const hideSelectUI = (includeTransform = true) => {
    // remove rect
    if (mainSketch.boundingBox) {
        mainSketch.boundingBox.remove();
        mainSketch.boundingBox = null;
    }
    // hide ui
    deleteHandler.style.display = "none";
    // rotateSlider.style.display = "none";
    initialiseHandler.style.display = "none";
    if (includeTransform) {
        transformControl.style.display = "none";
    }
};

const updateRectBounds = (from, to) => {
    mainSketch.boundingBox.bounds = new Rectangle(from, to);
    mainSketch.boundingBox.strokeColor = "#D2D2D2";
    mainSketch.boundingBox.strokeWidth = 2;
    mainSketch.boundingBox.data.state = "resizing";
};

const updateSelectUI = () => {
    if (mainSketch.boundingBox) {
        deleteHandler.style.display = "block";
        if (showAI) {
            initialiseHandler.style.display = "block";
        }
        transformControl.style.display = "flex";

        // Large is applied to top for taller screen
        const smallTopPadding =
            containerRect.width < window.innerHeight ? 0 : padding;
        const largeTopPadding =
            containerRect.width < window.innerHeight ? largerPadding : 0;
        // Large is applied to left for width screen
        const smallLeftPadding =
            containerRect.width < window.innerHeight ? padding : 0;
        const largeLeftPadding =
            containerRect.width < window.innerHeight ? 0 : largerPadding;

        deleteHandler.style.left =
            mainSketch.boundingBox.bounds.topRight.x +
            largeLeftPadding +
            smallLeftPadding +
            "px";
        initialiseHandler.style.left =
            mainSketch.boundingBox.bounds.topLeft.x +
            largeLeftPadding +
            smallLeftPadding +
            "px";
        deleteHandler.style.bottom =
            mainSketch.frameSize -
            mainSketch.boundingBox.bounds.top +
            smallTopPadding +
            largeTopPadding -
            deleteHandler.getBoundingClientRect().height / 2 +
            "px";
        initialiseHandler.style.bottom =
            mainSketch.frameSize -
            mainSketch.boundingBox.bounds.top +
            smallTopPadding +
            largeTopPadding -
            initialiseHandler.getBoundingClientRect().height / 2 +
            "px";
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
};

const stopClip = () => {
    ws.send(
        JSON.stringify({
            status: "stop",
        })
    );
};

// switchControls();

const parseFromSvg = (svg) => {
    if (svg === "") return null;
    userLayer.clear();
    let paperObject = userLayer.importSVG(svg);
    const numPaths = paperObject.children[0].children.length;
    for (const returnedIndex in paperObject.children[0].children) {
        const child = paperObject.children[0].children[returnedIndex];
        child.smooth();
        // AI Stroke Effects
        if (returnedIndex >= numPaths - 50) {
            // console.log("AI Path: ", child);
            child.opacity = 0.5;

            // const pathEffect = child.clone({ insert: false });
            // userLayer.addChild(pathEffect);

            // // pathEffect.position.y += 100;
            // // pathEffect.strokeColor = "#FFFF00";
            // pathEffect.mainSketch.opacity = 0.8;
            // pathEffect.mainSketch.strokeWidth = mainSketch.strokeWidth * 2;
            // userLayer.addChild(pathEffect);
            // try mainSketch.opacity
        }

        const pathEffect = child.clone({ insert: false });
        userLayer.addChild(pathEffect);

        // Add all to main canvas by adding to user layer as children.
        // Works but makes it harder to clear the canvas. So maybe just do this on draw stop!!
        // userLayer.addChild(child);
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
    console.log(mainSketch.stack.historyHolder);
    console.log(batchSize);
    console.log(traceList);
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
        lossText.innerHTML = `Rolling loss: ${newRollingLoss}`;
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
    const items = getHistoryBatch(setTraces.value, fromIndex);
    let refList = [];
    for (let pastGen of items) {
        refList.push(parseFromSvg(pastGen.svg));
    }
    mainSketch.traces = refList;
};

const moveSelecterTo = (elem) => {
    selectDot.style.left = elem.getBoundingClientRect().x + "px";
    selectDot.style.top = elem.getBoundingClientRect().y + "px";
    let colorClass = elem.firstChild.nextElementSibling.classList[0];
    colorClass === undefined && (colorClass = "brush");
    selectDot.firstElementChild.firstElementChild.classList.remove(
        "brush",
        "select",
        "erase",
        "region"
    );
    selectDot.firstElementChild.firstElementChild.classList.add(colorClass);
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
            timeKeeper.setAttribute("max", String(step));
            timeKeeper.value = String(step);
            setTraces.setAttribute("max", String(step));
            step += 1; //avoid disconnected iteration after stopping

            mainSketch.lastRender = parseFromSvg(result.svg);

            // To do change this so it is just max num mainSketch.traces
            if (mainSketch.showTraces > 1) {
                // setTraces.value = String(step);
                showTraceHistoryFrom(mainSketch.stack.historyHolder.length - 1);
            }

            calcRollingLoss();
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

    switch (mainSketch.penMode) {
        case "erase":
            eraseTool.activate();
            moveSelecterTo(accentTarget);
            break;
        case "pen":
            multiTool.activate();
            moveSelecterTo(accentTarget);
            break;
        case "select":
            multiTool.activate();
            moveSelecterTo(accentTarget);
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
            moveSelecterTo(accentTarget);
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