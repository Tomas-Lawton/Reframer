// Drawing Controls
document.querySelectorAll(".pen-mode").forEach((elem) => {
    elem.addEventListener("click", () => {
        setPenMode(elem.id, elem);
    });
});
document.querySelectorAll(".swatch").forEach((elem) => {
    elem.addEventListener("click", () => {
        let col = window.getComputedStyle(elem).backgroundColor;
        mainSketch.strokeColor = col;
        opacitySlider.value = 100;
        picker.setColor(col);
        getRGBA();
    });
});

document.getElementById("delete").addEventListener("click", () =>
    openModal({
        title: "Clearing Canvas",
        message: "Are you sure you want to delete your drawing? :(",
        confirmAction: () => {
            mainSketch.lastPrompt = null; //clear for draw (not redraw)
            // drawButton.innerHTML = "Draw";
            userLayer.clear();
            // prompt.value = "";
            modal.style.display = "none";
        },
    })
);

document.body.addEventListener("keydown", function(event) {
    if (document.activeElement !== prompt) {
        if (event.key == "Delete" || event.key == "Backspace") {
            deletePath();
        }
    }
});

deleteHandler.addEventListener("click", (e) => {
    deletePath();
});

initialiseHandler.addEventListener("click", (e) => {
    // need to unpack the group, but keep a ref to the selected/grouped paths

    // Reference selected
    // Unpack to SVG
    // Save the unpakced SVG
    // Clear the canvas
    // Import the referenced paths
    // Export full sketch
    // Initialise using the resulting SVG
    // DONE
    // Don't need to import saved because overwritten by drawer.

    // let selectedItems = getSelectedPaths();
    const remove = userLayer.getItems().filter((path) => !path.selected);
    remove.forEach((item) => item.remove());
    unpackGroup();
    const svg = paper.project.exportSVG({
        asString: true,
    });
    console.log(svg);
    // userLayer.clear();
    mainSketch.draw(false, svg); //breaks with group

    // Special case
    // unpackGroup();
});

document.getElementById("begin").addEventListener("click", () => {
    document.getElementById("sliding-overlay").style.bottom = "100%";
});

document.getElementById("undo").addEventListener("click", () => {
    if (mainSketch.stack.undoStack.length > 0) {
        const lastEvent = mainSketch.stack.undoStack.pop();
        if (lastEvent.type === "draw-event") {
            let thisPath; //json from redo, otherwise path
            try {
                let temp = new Path();
                thisPath = temp.importJSON(lastEvent.data);
            } catch (e) {
                thisPath = lastEvent.data;
            }
            let copy = thisPath.exportJSON();
            mainSketch.stack.redoStack.push({
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
            mainSketch.stack.redoStack.push({
                type: "delete-event",
                data: pathData, //use ref
            });
        }
        if (lastEvent.type === "erase-event") {
            let afterErase = userLayer.exportJSON();
            userLayer.clear();
            let lastItems = userLayer.importJSON(lastEvent.data);
            mainSketch.stack.redoStack.push({
                type: "erase-event",
                data: afterErase, //use ref
            });
        }
    }
});
document.getElementById("redo").addEventListener("click", () => {
    if (mainSketch.stack.redoStack.length > 0) {
        const lastEvent = mainSketch.stack.redoStack.pop();
        if (lastEvent.type === "draw-event") {
            let item = new Path();
            item.importJSON(lastEvent.data);
            mainSketch.stack.undoStack.push(lastEvent);
        }
        if (lastEvent.type === "delete-event") {
            let pathList = [];
            lastEvent.data.map((path) => {
                let pathCopy = path.exportJSON();
                path.remove();
                pathList.push(pathCopy);
            });
            mainSketch.stack.undoStack.push({
                type: "delete-event",
                data: pathList,
            }); // need to store a json to redraw
        }
        if (lastEvent.type === "erase-event") {
            let beforeErase = userLayer.exportJSON();
            userLayer.clear();
            let eraseItems = userLayer.importJSON(lastEvent.data);
            mainSketch.stack.undoStack.push({
                type: "erase-event",
                data: beforeErase, //use ref
            });
        }
    }
});
document.getElementById("save").addEventListener("click", () => {
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
});
document.getElementById("width-slider").oninput = function() {
    mainSketch.strokeWidth = this.value;
    const point = document.getElementById("point-size");
    point.style.width = mainSketch.strokeWidth + "px";
    point.style.height = mainSketch.strokeWidth + "px";
    getSelectedPaths().forEach(
        (item) => (item.strokeWidth = mainSketch.strokeWidth)
    );
    // setPenMode("pen", document.getElementById("pen"));
};

selectGroup = null;

rotateSlider.oninput = function() {
    hideSelectUI(false);
    let r = this.value;
    mainSketch.rotationGroup.rotation = r;
    let items = getSelectedPaths();
    fitToSelection(items, "rotating");
    updateSelectUI();
};

scaleSlider.oninput = function() {
    // if (mainSketch.boundingBox.data.state === "rotating") {
    hideSelectUI(false);
    let selectedPaths = getSelectedPaths(); // all selected

    for (child of selectedPaths) {
        child.applyMatrix = false;
        child.scaling = this.value / 5;
    }
    fitToSelection(selectedPaths, "scaling");
    updateSelectUI();
};
scaleSlider.onmouseup = function() {
    console.log("done");
};

opacitySlider.oninput = function() {
    mainSketch.opacity = this.value / 100;
    getRGBA();
    getSelectedPaths().forEach((item) => (item.opacity = mainSketch.opacity));
};

document.getElementById("settings").addEventListener("click", () => {
    openModal({
        title: "Advanced",
        message: "Change the drawing behaviour and UI.",
        ui: document.getElementById("settings-ui"),
    });
});

timeKeeper.oninput = function() {
    if (this.value === 0) return; // 0 is pre-generation state
    historyIndex = this.value;
    userLayer.clear();
    if (mainSketch.showTraces) {
        showTraceHistoryFrom(historyIndex);
    } else {
        let svg = mainSketch.stack.historyHolder[historyIndex].svg;
        parseFromSvg(svg);
    }
};

palette.addEventListener("click", () => {
    toggleArtControls();
});

prompt.addEventListener("input", (e) => {
    mainSketch.prompt = e.target.value;
});

// Action controls
actionControls[0].addEventListener("click", () => {
    if (mainSketch.drawState === "inactive" || mainSketch.drawState === "stop") {
        mainSketch.draw();
    }
});
actionControls[1].addEventListener("click", () => {
    if (mainSketch.drawState === "inactive" || mainSketch.drawState === "stop") {
        mainSketch.generate();
    }
});
actionControls[2].addEventListener("click", () => {
    if (mainSketch.drawState === "stop") {
        mainSketch.redraw();
    }
});
actionControls[3].addEventListener("click", () => {
    if (mainSketch.drawState === "stop") {
        mainSketch.continue();
    }
});
actionControls[4].addEventListener("click", () => {
    if (mainSketch.drawState === "active") {
        mainSketch.stop();
    }
});

document.getElementById("use-squiggles").addEventListener("change", (event) => {
    mainSketch.initRandomCurves = mainSketch.initRandomCurves;
    let container = document.getElementById("contain-num-squiggles");
    if (container.style.display === "none") {
        container.style.display = "contents";
    } else {
        container.style.display = "none";
    }
});

document.getElementById("num-squiggles").oninput = function() {
    mainSketch.numRandomCurves = parseInt(this.value);
};

// LOAD UI

// Random partial sketch
// const partial = userLayer.importSVG(sketches[Math.floor(Math.random() * 3)]);
// partial.scale(1000);
// // TO DO: Scale to canvas size
// partial.set({
//     position: new Point(540, 540),
//     strokeWidth: mainSketch.strokeWidth,
//     opacity: mainSketch.opacity,
//     strokeCap: "round",
//     strokeJoin: "round",
// });
// partial.getItems().forEach((path) => userLayer.addChild(path));
// partial.remove();

if (window.innerWidth <= 990) {
    const aiCard = document.getElementById("describe-card");
    document.querySelector("body").prepend(aiCard);
    document
        .getElementById("right-background")
        .prepend(document.getElementById("moodboard-header"));
} else {
    setPenMode("pen", document.getElementById("pen"));
}

const picker = new Picker({
    parent: document.getElementById("color-picker"),
    popup: false,
    alpha: false,
    defaultColor: "#0cf",
    editor: false,
    editorFormat: "hex", // or 'rgb', 'hsl'
});

picker.setColor(mainSketch.strokeColor);
picker.onChange = (color) => {
    mainSketch.strokeColor = color.rgbaString;
    getRGBA();
    getSelectedPaths().forEach(
        (item) => (item.strokeColor = mainSketch.strokeColor)
    );
    // setPenMode("pen", document.getElementById("pen"));
};

setActionUI("inactive");

addExemplarButtonsdocument.addEventListener("click", () => {
    importToSketch();
});

let events = 0;
document.getElementById("save-events").onclick = () => {
    dumpUserEvents({
        user_id: uuid,
        recorded_data: {
            events: {
                hello: "world",
            },
            events: events,
        },
    });
    events += 1;
};