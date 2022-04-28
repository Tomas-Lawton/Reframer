const getSelectedPaths = () =>
    userLayer.getItems().filter((path) => path.selected);

const toggleArtControls = () => {
    let rect = palette.getBoundingClientRect();
    console.log(rect);
    // artControls.style.right = `10px`;

    console.log(canvas.width);
    artControls.style.right = `${rect.width / 2}px`;

    artControls.style.top = `${rect.bottom - rect.height / 2}px`;

    if (!artControls.style.display || artControls.style.display === "none") {
        artControls.style.display = "block";
    } else {
        artControls.style.display = "none";
    }
};

const noPrompt = () =>
    prompt.value === "" ||
    prompt.value === undefined ||
    prompt.value === prompt.getAttribute("placeholder");

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
    if (buttonControlLeft) {
        console.log(window.innerWidth);
        buttonPanel.style.left = `${window.innerWidth - buttonPanel.offsetWidth}px`;
    } else {
        buttonPanel.style.left = 0;
    }
    buttonControlLeft = !buttonControlLeft;
};

const startDrawing = (status, hasRegion = false, setSVG = null) => {
    // userLayer.activate();
    isFirstIteration = true; //reset canvas
    let canvasBounds = canvas.getBoundingClientRect(); //avoid canvas width glitches
    const request = {
        status: status,
        data: {
            prompt: prompt.value,
            svg: setSVG ?
                setSVG :
                paper.project.exportSVG({
                    asString: true,
                }),
            frame_size: status === "sketch_exemplars" ? exemplarSize : "None",
            region: {
                activate: hasRegion,
                x1: drawRegion ? drawRegion.x : 0,
                y1: drawRegion ? canvasBounds.height - drawRegion.y : 0,
                x2: drawRegion ? drawRegion.x + drawRegion.width : canvasBounds.width,
                y2: drawRegion ?
                    canvasBounds.height - drawRegion.y - drawRegion.height // use non-web y coords
                    :
                    canvasBounds.height, // same as width
            },
        },
    };
    lastPrompt = prompt.value;
    console.log(request);
    ws.send(JSON.stringify(request));
};

// dragging moves select elements + ui
const hideSelectUI = () => {
    // remove rect
    if (boundingBox) {
        boundingBox.remove();
        boundingBox = null;
    }
    // hide ui
    deleteHandler.style.display = "none";
    rotateHandler.style.display = "none";
    initialiseHandler.style.display = "none";
};

const updateSelectUI = () => {
    if (boundingBox) {
        rotateHandler.style.display = "block";
        deleteHandler.style.display = "block";
        initialiseHandler.style.display = "block";

        rotateHandler.style.left = boundingBox.bounds.bottomCenter.x + "px";
        rotateHandler.style.top =
            boundingBox.bounds.bottomCenter.y +
            rotateHandler.getBoundingClientRect().height / 2 +
            "px";

        deleteHandler.style.left =
            boundingBox.bounds.topRight.x -
            deleteHandler.getBoundingClientRect().width / 2 +
            "px";
        deleteHandler.style.bottom =
            1080 -
            boundingBox.bounds.topRight.y -
            deleteHandler.getBoundingClientRect().height / 2 +
            "px";

        initialiseHandler.style.left =
            boundingBox.bounds.topLeft.x +
            // initialiseHandler.getBoundingClientRect().width / 2
            "px";
        initialiseHandler.style.bottom =
            1080 -
            boundingBox.bounds.topRight.y -
            initialiseHandler.getBoundingClientRect().height / 2 +
            "px";
    }
};

const deletePath = () => {
    selected = getSelectedPaths();
    if (selected.length > 0) {
        pathList = selected.map((path) => path.exportJSON()); //dont use paper ref
        console.log(pathList);
        undoStack.push({
            type: "delete-event",
            data: pathList,
        });
        selected.map((path) => path.remove());
    }
    if (boundingBox) {
        hideSelectUI();
    }
};

const stopClip = () => {
    ws.send(
        JSON.stringify({
            status: "stop",
        })
    );
    drawButton.innerHTML = "Redraw";
    continueButton.innerHTML = "Continue";
};

// switchControls();

const resetHistory = () => {
    step = 0; // reset since not continuing
    historyHolder = [{ svg: "" }];
    timeKeeper.style.width = "0";
    timeKeeper.setAttribute("max", "0");
    timeKeeper.value = "0";
};

const parseFromSvg = (svg) => {
    if (svg === "") return null;
    let paperObject = userLayer.importSVG(svg);
    const numPaths = paperObject.children[0].children.length;
    console.log(numPaths, " Paths");

    for (const returnedIndex in paperObject.children[0].children) {
        const child = paperObject.children[0].children[returnedIndex];
        child.smooth();
        // AI Stroke Effects
        if (returnedIndex >= numPaths - 32) {
            // console.log("AI Path: ", child);
            child.opacity = 0.4;
            // const pathEffect = child.clone({ insert: false });
            // // pathEffect.position.y += 100;
            // // pathEffect.strokeColor = "#FFFF00";
            // pathEffect.opacity = 0.8;
            // pathEffect.strokeWidth = strokeWidth * 2;
            // userLayer.addChild(pathEffect);
            // try opacity
        }

        // Add all to main canvas by adding to user layer as children.
        // Works but makes it harder to clear the canvas. So maybe just do this on draw stop!!
        // userLayer.addChild(child);
    }
    return paperObject;
};

const getHistoryBatch = (maxSize, startIdx) => {
    let len = historyHolder.length;
    if (len <= 1) return null;
    let lossList = [];
    let batchSize = Math.min(maxSize, startIdx); // not first item
    for (let i = 0; i < batchSize; i++) {
        lossList.push(historyHolder[startIdx - i]);
    }
    return lossList;
};

// update because loss varies a lot??
const calcRollingLoss = () => {
    const items = getHistoryBatch(setTraces.value, historyHolder.length - 1);
    console.log(items);
    if (items) {
        const sum = items.reduce(
            (partialSum, historyItem) => partialSum + historyItem.loss,
            0
        );
        const newRollingLoss = sum / items.length;
        lossText.innerHTML = `Rolling loss: ${newRollingLoss}`;
        if (lastRollingLoss !== undefined) {
            if (Math.abs(lastRollingLoss - newRollingLoss) < 0.0001) {
                lossText.innerHTML = `Converged at: ${newRollingLoss}`;
                stopClip();
            }
        }
        lastRollingLoss = newRollingLoss;
    }
};

const showTraceHistoryFrom = (fromIndex) => {
    const items = getHistoryBatch(setTraces.value, fromIndex);
    let refList = [];
    for (let pastGen of items) {
        refList.push(parseFromSvg(pastGen.svg));
    }
    traces = refList;
};

const moveSelecterTo = (elem) => {
    selectDot.style.left = elem.getBoundingClientRect().x + "px";
    selectDot.style.top = elem.getBoundingClientRect().y + "px";
    let colorClass = elem.firstChild.nextElementSibling.classList[0];
    selectDot.firstElementChild.firstElementChild.classList.remove(
        "brush",
        "select",
        "erase",
        "region"
    );
    selectDot.firstElementChild.firstElementChild.classList.add(colorClass);
};

ws.onmessage = function(event) {
    result = JSON.parse(event.data);
    console.log(result);
    // if (clipDrawing)

    if (result.status === "stop") {
        console.log("Stopped drawer");
        clipDrawing = false;
        // stop exemplars also?
    }

    if (result.status === "draw") {
        //sketch
        if (isFirstIteration) {
            userLayer.clear();
            isFirstIteration = false;
        } else {
            // Delete ref to last gen and old traces
            if (lastRender) {
                lastRender.remove();
            }
            if (traces) {
                for (const trace of traces) {
                    trace.remove();
                }
            }
        }
        historyHolder.push(result);
        step += 1; //avoid disconnected iteration after stopping
        timeKeeper.style.width = "100%";
        timeKeeper.setAttribute("max", String(step));
        timeKeeper.value = String(step);
        setTraces.setAttribute("max", String(step));

        // draw and save current
        lastRender = parseFromSvg(result.svg);
        // draw and save traces

        // To do change this so it is just max num traces
        // if (showTraces) {
        //     // setTraces.value = String(step);
        //     showTraceHistoryFrom(historyHolder.length - 1);
        // }

        calcRollingLoss();
        console.log(
            `Draw iteration: ${result.iterations} \nLoss value: ${result.loss}`
        );
    }
    var matches = result.status.match(/\d+/g);
    if (matches != null) {
        let exemplar_canvas = exemplarScope.projects[parseInt(result.status)];
        exemplar_canvas.activate();
        exemplar_canvas.clear();
        let svg = result.svg;
        if (svg === "") return null;
        exemplar_canvas.importSVG(result.svg);

        document.querySelectorAll(".card-info div p")[
            parseInt(result.status)
        ].innerHTML = `Loss: ${result.loss.toPrecision(5)}`;
    }
};