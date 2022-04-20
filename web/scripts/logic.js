const getSelectedPaths = () =>
    userLayer.getItems().filter((path) => path.selected);

const toggleArtControls = () => {
    let rect = palette.getBoundingClientRect();
    artControls.style.right = `10px`;
    artControls.style.top = `${rect.bottom + rect.y}px`;

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

const startDrawing = (status, hasRegion = false) => {
    // userLayer.activate();
    isFirstIteration = true; //reset canvas
    let canvasBounds = canvas.getBoundingClientRect(); //avoid canvas width glitches
    const request = {
        status: status,
        data: {
            prompt: prompt.value,
            svg: paper.project.exportSVG({
                asString: true,
            }),
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

const deletePath = (key) => {
    if (key == "Delete" || key == "Backspace") {
        deletePath();
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
    for (const child of paperObject.children) {
        child.children.forEach((path) => {
            // path.simplify();
            path.smooth();
        });
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

ws.onmessage = function(event) {
    if (clipDrawing) {
        result = JSON.parse(event.data);
        console.log(result);

        if (result.status === "stop") {
            console.log("Stopped drawer");
            clipDrawing = false;
        }

        if (result.status === "draw") {
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
            if (showTraces) {
                // setTraces.value = String(step);
                showTraceHistoryFrom(historyHolder.length - 1);
            }

            calcRollingLoss();
            console.log(
                `Draw iteration: ${result.iterations} \nLoss value: ${result.loss}`
            );
        }
    }
};