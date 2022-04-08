const ws = new WebSocket("ws://localhost:8000/ws");
const localHost = "http://localhost:8000";

const canvas = document.getElementById("canvas");
const canvas1 = document.getElementById("canvas1");
const canvas2 = document.getElementById("canvas2");
const canvas3 = document.getElementById("canvas3");
const prompt = document.getElementById("messageText");
const modal = document.getElementById("modal");
const controlPanel = document.getElementById("control-panel");
const buttonPanel = document.getElementById("button-panel");
const artControls = document.getElementById("art-controls");
const penControls = document.getElementById("pen-controls");
const selectControls = document.getElementById("select-controls");
const message = document.getElementById("message");
const startCollab = document.getElementById("draw");

// Default draw settings
let backgroundColor = "#FCFCFC";
// let backgroundColor = "red";

let strokeColor = "#402f95";
let strokeWidth = 20;
let penMode = "pen";
let collabDrawing = false;
let buttonControlLeft = true;
let showLastPaths = true;
let myPath,
    currentSelectedPath,
    lastRender,
    erasePath,
    tmpGroup,
    mask,
    firstLoad;
undoStack = [];
redoStack = [];

// Setup
paper.install(window);
const scope = new PaperScope();
const scope1 = new PaperScope();
const scope2 = new PaperScope();
const scope3 = new PaperScope();

scope.setup(canvas);
scope1.setup(canvas1);
scope2.setup(canvas2);
scope3.setup(canvas3);
canvas.style.background = backgroundColor;
// canvas1.style.background = backgroundColor;
// canvas2.style.background = backgroundColor;
// canvas3.style.background = backgroundColor;
scope.activate();
// scope1.activate();
// scope2.activate();
// scope3.activate();

const topLayer = new Layer(); //for drawing + erase mask
const penTool = new Tool(); //refactor to single tool?
const eraseTool = new Tool();

function getSelectedPaths() {
    return topLayer.getItems().filter((path) => path.selected);
}

penTool.onMouseDown = function(event) {
    if (penMode === "select") {
        path = null;
        var hitResult = paper.project.hitTest(event.point, {
            segments: true,
            stroke: true,
            // tolerance: 5
        });
        if (!hitResult) {
            topLayer.getItems().forEach((path) => {
                console.log(path);
                path.selected = false;
            });
            return;
        }
        if (hitResult) {
            path = hitResult.item;
            path.selected = true; //fix so that this happens with no drag but with drag it won't toggle !path.selected
        }
    }
    if (penMode === "pen") {
        myPath = new Path({
            strokeColor: strokeColor,
            strokeWidth: strokeWidth,
            strokeCap: "round",
            strokeJoin: "round",
        });
        myPath.add(event.point);
        myPath.add({
            ...event.point,
            x: event.point.x + 0.001, //this is ok because path gets simplified
        }); //in case no drag means no line segment
    }
};
penTool.onMouseDrag = function(event) {
    if (penMode === "pen") {
        myPath.add(event.point);
        myPath.smooth();
    }
    if (penMode === "select") {
        const selectedPaths = getSelectedPaths(); // all selected
        console.log(selectedPaths);
        selectedPaths.forEach((path) => {
            path.position.x += event.delta.x;
            path.position.y += event.delta.y;
        });
    }
};
penTool.onMouseUp = function(event) {
    // collabDrawing = true
    if (penMode === "pen") {
        myPath.simplify();
        // sendPaths();
        undoStack.push({
            type: "draw-event",
            data: myPath,
        });
    }
    console.log(paper.project.exportSVG());
};

eraseTool.onMouseDown = function(event) {
    erasePath = new Path({
        strokeWidth: strokeWidth * view.pixelRatio,
        strokeCap: "round",
        strokeJoin: "round",
        strokeColor: backgroundColor,
    });
    tmpGroup = new Group({
        children: topLayer.removeChildren(),
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

        topLayer.addChildren(tmpGroup.removeChildren());
        mask.remove();
    }
};

const toggleArtControls = () => {
    if (!artControls.style.display || artControls.style.display === "none") {
        artControls.style.display = "block";
    } else {
        artControls.style.display = "none";
    }
};

// Drawing Controls
document.querySelectorAll(".pen-mode").forEach((elem) => {
    elem.addEventListener("click", (e) => {
        penMode = elem.id;
        switch (penMode) {
            case "erase":
                paper.tools[1].activate();
                break;
            case "pen":
                toggleArtControls();
                if (buttonControlLeft) {
                    let x = e.clientX + 30 + "px";
                    let y = e.clientY - 300 + "px";
                    artControls.style.top = y;
                    artControls.style.left = x;
                } else {
                    let x = e.clientX - 30 - artControls.offsetWidth + "px";
                    let y = e.clientY - 300 + "px";
                    artControls.style.top = y;
                    artControls.style.left = x;
                }
                paper.tools[0].activate();
                break;
            case "select":
                toggleArtControls();
                paper.tools[0].activate();
                break;
            case "lasso":
                paper.tools[0].activate();
                // Not sure what it does yet?
                break;
        }

        // Not-pen mode
        if (penMode !== "select") {
            topLayer.getItems().forEach((path) => {
                console.log(path);
                path.selected = false;
            });
        }
        if (penMode !== "pen" && penMode !== "select") {
            artControls.style.display = "none";
        }
        console.log(penMode);
    });
});

let history = {};
history["main-canvas"] = [];
let updateHistory = (sketch) => {
    history["main-canvas"].push(sketch);
    // decrease opacity of all elements by same amount
    for (const oldSketch of history["main-canvas"]) {
        oldSketch.getItems().forEach((item) => {
            item.opacity *= 0.6;
        });
    }
    // if len greater, get and delete first element
    if (history["main-canvas"].length > 5) {
        firstHistory = history["main-canvas"][0];
        firstHistory.remove();
    }
};

const setVisibilityHistory = () => {
    for (const oldSketch of history["main-canvas"]) {
        oldSketch.getItems().forEach((item) => {
            item.visible = !item.visible;
        });
    }
};

ws.onmessage = function(event) {
    if (collabDrawing) {
        if (lastRender) {
            // updateHistory(lastRender);
            lastRender.remove();
        }
        if (firstLoad) {
            topLayer.clear();
            firstLoad = false;
        }
        const { svg, iterations, loss } = JSON.parse(event.data);
        let loadedSvg = topLayer.importSVG(svg);
        for (const child of loadedSvg.children) {
            child.children.forEach((path) => {
                // path.simplify();
                path.smooth();
            });
        }
        // if (!showLastPaths) {
        //     lastRender = loadedSvg;
        // }
        lastRender = loadedSvg;

        console.log(`Draw iteration: ${iterations} \nLoss value: ${loss}`);
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
    event.preventDefault();
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

document.body.addEventListener("keydown", function(event) {
    if (document.activeElement !== prompt) {
        var handled = false;
        if (event.key == "Delete") {
            deletePath();
            handled = true;
        }
        if (event.key == "Backspace") {
            deletePath();
            handled = true;
        }
        if (handled) {
            // Suppress "double action" if event handled
            event.preventDefault();
        }
    }
});

document.getElementById("send-prompt").addEventListener("submit", (e) => {
    e.preventDefault();
    var input = prompt;
    pathData = paper.project.exportSVG({
        asString: true,
    });
    // message.innerHTML = input.value;
    // input.value = "";
    if (!collabDrawing) {
        // start drawing
        firstLoad = true; //so canvas reset
        ws.send(
            JSON.stringify({
                status: "start",
                data: {
                    prompt: input.value,
                    svg: pathData,
                },
            })
        );
        startCollab.innerHTML = "STOP";
    }
    if (collabDrawing) {
        // stop drawing
        ws.send(
            JSON.stringify({
                status: "stop",
            })
        );
        startCollab.innerHTML = "DRAW";
    }
    collabDrawing = !collabDrawing;
});
document.getElementById("begin").addEventListener("click", () => {
    document.getElementById("sliding-overlay").style.bottom = "100%";
});
document.getElementById("delete").addEventListener("click", () => {
    modal.style.display = "block";
});
document.getElementById("cancel-modal").addEventListener("click", () => {
    modal.style.display = "none";
});
document.getElementById("modal-cross").addEventListener("click", () => {
    modal.style.display = "none";
});
document.getElementById("confirm-modal").addEventListener("click", () => {
    topLayer.clear();
    modal.style.display = "none";
});
document.getElementById("switch-side").addEventListener("click", () => {
    switchControls();
});
document.getElementById("undo").addEventListener("click", () => {
    if (undoStack.length > 0) {
        const lastEvent = undoStack.pop();
        if (lastEvent.type === "draw-event") {
            let thisPath; //json from redo, otherwise path
            try {
                let temp = new Path();
                thisPath = temp.importJSON(lastEvent.data);
            } catch (e) {
                thisPath = lastEvent.data;
            }
            let copy = thisPath.exportJSON();
            redoStack.push({
                type: "draw-event",
                data: copy,
            }); //so remove does not remove reference
            thisPath.remove();
        }
        if (lastEvent.type === "delete-event") {
            let pathData = [];
            lastEvent.data.map((redrawPath) => {
                let thisPath = new Path();
                thisPath = thisPath.importJSON(redrawPath);
                pathData.push(thisPath);
            });
            redoStack.push({
                type: "delete-event",
                data: pathData, //use ref
            });
        }
        if (lastEvent.type === "erase-event") {
            // TO DO
        }
    }
});
document.getElementById("redo").addEventListener("click", () => {
    if (redoStack.length > 0) {
        const lastEvent = redoStack.pop();
        if (lastEvent.type === "draw-event") {
            let item = new Path();
            item.importJSON(lastEvent.data);
            undoStack.push(lastEvent);
        }
        if (lastEvent.type === "delete-event") {
            let pathList = [];
            lastEvent.data.map((deletePath) => {
                let pathCopy = deletePath.exportJSON();
                deletePath.remove();
                pathList.push(pathCopy);
            });
            undoStack.push({
                type: "delete-event",
                data: pathList,
            }); // need to store a json to redraw
        }
        if (lastEvent.type === "erase-event") {
            // TO DO
        }
    }
});
document.getElementById("save").addEventListener("click", () => {
    view.element.toBlob((blob) => {
        var url = window.URL || window.webkitURL;
        link = url.createObjectURL(blob);
        window.open(link, "_blank");

        var isIE = false || !!document.documentMode;
        if (isIE) {
            window.navigator.msSaveBlob(blob, fileName);
        } else {
            var a = document.createElement("a");
            a.setAttribute("download", "sketch.png");
            a.setAttribute("href", link);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    });
});
document.getElementById("time").addEventListener("click", () => {
    showLastPaths = !showLastPaths;
    setVisibilityHistory();
});
document.getElementById("width-slider").oninput = function() {
    strokeWidth = this.value;
};
document.getElementById("scale-slider").oninput = function() {
    let newScale = this.value / 10;
    let selected = getSelectedPaths();
    for (child of selected) {
        child.applyMatrix = false;
        child.scaling = newScale;
    }
};
document.getElementById("rotate-slider").oninput = function() {
    let angle = this.value;
    console.log(angle);
    let selected = getSelectedPaths();
    for (child of selected) {
        // implement all of these methods for selecting shapes
        // http://sketch.paperjs.org/#V/0.12.7/S/nVdtb9s2EP4rrArUEqqoibcMqL1gQNpuK9BhRZJtH+J8oCXKVkOTBknnZUH++46vImUl2WYggXk83tvz3JF+yBjekGyWnV8TVa+zMqt5o9c3WKB1p37fqo4ziU7Qw4ItlCSrDWFKzpASO1IakRL8mkSCtqM0WipOicCsBpXjBXucg4y1O1Zru6gR+PZXcpfflqguESvACYKPcQ4+GblFX7FaV2dktaNYfOX0fsVZbuS8Yyo/OjwsEfwrSvRDiW7ROzQt5tbIupKEklqR5gOnXIC5iYJA5BYLSGHitOz/GnZr9OoE7VhD2o6RBv0EghlaZK/Je/K+bReZO8B0XENVZlQhE3y/EyroritdXX0gCHR1fDx1kDZY4WrdrdYU/pTL/BfBd9vclUQHue5oA7HP0OUGX5NTDhHIfA2p6+UHLhgR/fqiU5TA6qoMBixUxvsMTV7jKZ627aTfv+lkt6QAVIupJFb8WCSFEkTtBENrED4mSMYh8BJJD6WmjhyWS0K5juc91qsk4yLaqa1J2L8MYSJeLU3uleLbL6RV5fjWma7l2N6SAys3T520u+aw3b1y8bhYqpaLT7he5z733G6UqCtQj9YYiWuF2QpQibSMYeAjAUicnXRTdn8DIrIXBkT0Z1XhpvmgiQFQzweQObBWo2A5+nAPlFN+PlrhhbNQr8jnvhNLQuADgwb3np5stsmS4vp6EsHvW8E0+wW5U3EwoZWgclHRag7VZGo23qXctGSkbpvir65R6xk6HFRQeVJYiCAankrSSqu9ItgR9FmRTV9pCFDCUKwoX+WL7NxoIK2yyEoXn/fPwwwD13qkBnk6MSrXui9oLUXHVhf8ZwElyvcRqynB4tw5zH24W8G/gSREoiMdaQKu+f+QwBBl+QeTz+X5Qk5mHg3Z7ePC4P+GfMH3RMTV8mcGpOQ3wPw7EhFf82ypRQbdQQx+5l4eXYXvzr85c3l4VW257Izxk73JlKgePalqhk2iOx3X7SdXov3dc9re+H4hXHfGhVDPFmF69R/6IvWHm287qYZDp2tz500qrADqE7hGITSg6SKL2bQXU5KvX3iKIALYo+eOh5QAPxt4lENEypgv3rpLzcx3cncEB/0zZgoPEdCKqa81jPMSha99HMXcW3IvqxJtYfjOrUw717M4YrPBiHPq5uIFfM2tES2tNh372EEp4bkFGkeH/Q5nv/GdJB/5rS5Z6FpyA06L5HEH21vrlO0o1RaUewyeEbmjZt+1HsguiFTWCqDQ6QT6V6MJTHUtyl+F04VxZQZEOm2M7kLZSWoWj/Z03nt+86YPo1L3W0cYfRFYuljLLvxetYOhE5tEL9t0xQCzaGh3dCACkVwGfRl7u07mNCAnW7ENb7q2028KfWkJTm0OvbekNyAqweGraQ5nqqf6s8cIvCLiY6liaAAj8n1MOSN5PKAH1mtMySmW2kOEPzpIrfhpYIIdvx2CzaLHKKL+PjoTDfgkkMvr+uKNXQz9KykhhWfdWNH8GAqwhptca/uT6TX3mXUKfboxxCmHUIT0HvfbUuDVeFuOFatMp8WeC10Uz0Kg915yKSUKzx57EcZUiNgR8cCMK41+inwld0v4gVWrPMG+qChhK0Dy3Rh53ObAuqJ/Ev1KTC/TJx1sAM5uS+9zY7YYGFuKxFh0Kf5PgzB4T32Z9BDuX8o27rcoMVe6CAbiYu5t9tajzrG2T4e1T67RnoduDMBgeRH3MEGiwWZ+afmbfLR9k4ICbrak7syBowHFUpmX+rBg/HZUfzuiawqpkzdnKrs88D7tOjoCGVuVH9Fh/F4I1TT5kvzg++MYxv0XwvDAQP/fI4CM8Mn6h8eN7zqjFV4zb31LNYQq7GbMUy71JMnKbCkIvja1lNns8urxHw==
    }
};
const picker = new Picker({
    parent: document.getElementById("color-picker"),
    popup: false,
    alpha: true,
    defaultColor: "#0cf",
    editor: false,
    editorFormat: "hex", // or 'rgb', 'hsl'
});
picker.setColor("#402f95");
picker.onChange = (color) => {
    strokeColor = color.rgbaString;
};

// switchControls();