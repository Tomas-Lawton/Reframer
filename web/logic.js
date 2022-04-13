const getSelectedPaths = () =>
    userLayer.getItems().filter((path) => path.selected);

penTool.onMouseDown = function(event) {
    // refactor for multitouch
    switch (penMode) {
        case "select":
            path = null;
            var hitResult = paper.project.hitTest(event.point, {
                segments: true,
                stroke: true,
                fill: true,
            });
            if (!hitResult) {
                userLayer.getItems().forEach((path) => {
                    console.log(path);
                    path.selected = false;
                });
                return;
            }
            if (hitResult) {
                path = hitResult.item;
                path.selected = true; //fix so that this happens with no drag but with drag it won't toggle !path.selected
            }
            break;
        case "pen":
            myPath = new Path({
                strokeColor: strokeColor,
                strokeWidth: strokeWidth,
                opacity: opacity,
                strokeCap: "round",
                strokeJoin: "round",
            });
            myPath.add(event.point);
            myPath.add({
                ...event.point,
                x: event.point.x + 0.001,
            }); //make a segment on touch down (one point)
            break;
        case "lasso":
            drawRegion = new Rectangle(event.point);
            break;
    }
};
penTool.onMouseDrag = function(event) {
    switch (penMode) {
        case "pen":
            myPath.add(event.point);
            myPath.smooth();
            break;
        case "select":
            const selectedPaths = getSelectedPaths(); // all selected
            console.log(selectedPaths);
            selectedPaths.forEach((path) => {
                path.position.x += event.delta.x;
                path.position.y += event.delta.y;
            });
            break;
        case "lasso":
            drawRegion.width += event.delta.x;
            drawRegion.height += event.delta.y;
            if (regionPath !== undefined) regionPath.remove(); // redraw
            regionPath = new Path.Rectangle(drawRegion);
            regionPath.set({
                fillColor: "#e9e9ff",
                opacity: 0.4,
                selected: true,
            });
            // Start draw
            break;
    }
};
penTool.onMouseUp = function(event) {
    switch (penMode) {
        case "pen":
            myPath.simplify();
            // sendPaths();
            undoStack.push({
                type: "draw-event",
                data: myPath,
            });
            break;
        case "lasso":
            resetHistory(); //reset since not continuing
            startDrawing(prompt.value === lastPrompt ? "redraw" : "draw", true);
            clipDrawing = true;
            break;
    }
};

eraseTool.onMouseDown = function(event) {
    erasePath = new Path({
        strokeWidth: strokeWidth * view.pixelRatio,
        strokeCap: "round",
        strokeJoin: "round",
        strokeColor: backgroundColor,
    });
    tmpGroup = new Group({
        children: userLayer.removeChildren(),
        blendMode: "source-out",
        insert: false,
    });
    mask = new Group({
        children: [erasePath, tmpGroup],
        blendMode: "source-over",
    });
};
eraseTool.onMouseDrag = function(event) {
    console.log("erasing");
    erasePath.add(event.point);
};
eraseTool.onMouseUp = function(event) {
    if (erasePath.segments.length > 0) {
        erasePath.simplify();
        var eraseRadius = (strokeWidth * view.pixelRatio) / 2;
        var outerPath = OffsetUtils.offsetPath(erasePath, eraseRadius);
        var innerPath = OffsetUtils.offsetPath(erasePath, -eraseRadius);
        outerPath.insert = false;
        innerPath.insert = false;
        innerPath.reverse(); // reverse one path so we can combine them end-to-end

        // create a new path and connect the two offset paths into one shape
        var deleteShape = new Path({
            closed: true,
            insert: false,
        });
        deleteShape.addSegments(outerPath.segments); //added to item to end path where erased
        deleteShape.addSegments(innerPath.segments);

        var endCaps = new CompoundPath({
            children: [
                new Path.Circle({
                    center: erasePath.firstSegment.point,
                    radius: eraseRadius,
                }),
                new Path.Circle({
                    center: erasePath.lastSegment.point,
                    radius: eraseRadius,
                }),
            ],
            insert: false,
        });

        // // unite the shape with the endcaps
        // // this also removes all overlaps from the stroke
        deleteShape = deleteShape.unite(endCaps);
        deleteShape.simplify();

        // // grab all the items from the tmpGroup in the mask group
        var items = tmpGroup.getItems({
            overlapping: deleteShape.bounds,
        });

        items.forEach(function(item) {
            var result = item.subtract(deleteShape, {
                trace: false,
                insert: false,
            }); // probably need to detect closed vs open path and tweak these settings

            if (result.children) {
                // if result is compoundShape, yoink the individual paths out
                item.parent.insertChildren(item.index, result.removeChildren());
                item.remove();
            } else {
                if (result.length === 0) {
                    // a fully erased path will still return a 0-length path object
                    item.remove();
                } else {
                    item.replaceWith(result);
                }
            }
        });
        erasePath.remove(); // done w/ this now

        userLayer.addChildren(tmpGroup.removeChildren());
        mask.remove();
    }
};

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

// // historyHolder

// let history = {};
// history["main-canvas"] = [];
// let updateHistory = (sketch) => {
//     history["main-canvas"].push(sketch);
//     // decrease opacity of all elements by same amount
//     for (const oldSketch of history["main-canvas"]) {
//         oldSketch.getItems().forEach((item) => {
//             item.opacity *= 0.6;
//         });
//     }
//     // if len greater, get and delete first element
//     if (history["main-canvas"].length > 5) {
//         firstHistory = history["main-canvas"][0];
//         firstHistory.remove();
//     }
// };

// const setVisibilityHistory = () => {
//     for (const oldSketch of history["main-canvas"]) {
//         oldSketch.getItems().forEach((item) => {
//             item.visible = !item.visible;
//         });
//     }
// };

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

const drawingComplete = () => {};

const getLastFiveGens = (latestElem = historyHolder.length) => {};

// update because loss varies a lot??
const calcRollingLoss = () => {
    let len = historyHolder.length;
    if (len === 1) return;

    let lossList = [];
    let batchSize = Math.min(len, 5) - 1;
    for (let i = 0; i < batchSize; i++) {
        lossList.push(historyHolder[len - i - 1]);
    }
    const sum = lossList.reduce(
        (partialSum, historyItem) => partialSum + historyItem.loss,
        0
    );
    const avg = sum / lossList.length;
    console.log(avg);

    if (lastLoss !== undefined) {
        if (Math.abs(lastLoss - avg) < 0.0005) {
            console.log("stopping");
            stopClip();
        }
    }
    lastLoss = avg;
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
            if (lastRender) {
                //remove ref
                lastRender.remove();
            }
            if (isFirstIteration) {
                //remove user drawn lines
                userLayer.clear();
                isFirstIteration = false;
            }

            historyHolder.push(result);
            step += 1; //avoid disconnect iteration
            timeKeeper.style.width = "100%";
            timeKeeper.setAttribute("max", String(step));
            timeKeeper.value = String(step);

            let loadedSvg = parseFromSvg(result.svg);
            if (loadedSvg) {
                lastRender = loadedSvg;
            }

            calcRollingLoss();
            // if iterations

            // if (!showLastPaths) {
            //     lastRender = loadedSvg;
            // }
            console.log(
                `Draw iteration: ${result.iterations} \nLoss value: ${result.loss}`
            );
        }
    }
};