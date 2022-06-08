function dragEnter(e) {
    e.preventDefault();
    // staticSketches.classList.add("drop-ready");
    // canvas.classList.add("drop-ready");
}

function dragLeave(e) {
    e.preventDefault();
    staticSketches.classList.remove("drop-ready");
    canvas.classList.remove("drop-ready");
}

function tosketchController(e) {
    exportToExemplar(); //backup current
    const sketchCountIndex = e.dataTransfer.getData("text/plain");
    importToSketch(sketchCountIndex);
}

function toStaticSketches(e) {
    console.log("dropped");

    const sketchCountIndex = e.dataTransfer.getData("text/plain");
    exportToStatic(sketchCountIndex);
}

sketchContainer.addEventListener("dragenter", dragEnter);
sketchContainer.addEventListener("dragleave", dragLeave);
sketchContainer.addEventListener("drop", tosketchController);

staticSketches.addEventListener("dragenter", dragEnter);
staticSketches.addEventListener("dragleave", dragLeave);
staticSketches.addEventListener("drop", toStaticSketches);

// Drawing Controls
document.querySelectorAll(".pen-mode").forEach((elem) => {
    elem.addEventListener("click", () => {
        setPenMode(elem.id, elem);
    });
});
document.querySelectorAll(".swatch").forEach((elem) => {
    elem.addEventListener("click", () => {
        let col = window.getComputedStyle(elem).backgroundColor;
        sketchController.opacity = 1;
        opacitySlider.value = 100;

        sketchController.strokeColor = col;
        picker.setColor(col);
        getRGBA();
    });
});

document.getElementById("delete").addEventListener("click", () =>
    openModal({
        title: "Clearing Canvas",
        message: "Are you sure you want to delete your drawing?",
        confirmAction: () => {
            // Save before clearing
            sketchController.svg = paper.project.exportSVG({
                asString: true,
            });
            logger.event("clear-sketch");

            sketchController.lastPrompt = null;
            userLayer.clear();
            modal.style.display = "none";
            updateSelectUI();

            // Save again for redraws
            sketchController.svg = paper.project.exportSVG({
                asString: true,
            });
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
    // let selectedItems = getSelectedPaths();
    const remove = userLayer.getItems().filter((path) => !path.selected);
    remove.forEach((item) => item.remove());
    const svg = paper.project.exportSVG({
        asString: true,
    });
    console.log(svg);
    // userLayer.clear();
    sketchController.draw(false, svg); //breaks with group

    // Special case
    // unpackGroup();
});

document.getElementById("begin").addEventListener("click", () => {
    document.getElementById("sliding-overlay").style.bottom = "100%";
});

document.getElementById("undo").addEventListener("click", () => {
    if (sketchController.stack.undoStack.length > 0) {
        const lastEvent = sketchController.stack.undoStack.pop();
        if (lastEvent.type === "draw-event") {
            let thisPath; //json from redo, otherwise path
            try {
                let temp = new Path();
                thisPath = temp.importJSON(lastEvent.data);
            } catch (e) {
                thisPath = lastEvent.data;
            }
            let copy = thisPath.exportJSON();
            sketchController.stack.redoStack.push({
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
            sketchController.stack.redoStack.push({
                type: "delete-event",
                data: pathData, //use ref
            });
        }
        if (lastEvent.type === "erase-event") {
            let afterErase = userLayer.exportJSON();
            userLayer.clear();
            let lastItems = userLayer.importJSON(lastEvent.data);
            sketchController.stack.redoStack.push({
                type: "erase-event",
                data: afterErase, //use ref
            });
        }

        sketchController.svg = paper.project.exportSVG({
            asString: true,
        });
        logger.event("undo-" + lastEvent.type);
    }
});
document.getElementById("redo").addEventListener("click", () => {
    if (sketchController.stack.redoStack.length > 0) {
        const lastEvent = sketchController.stack.redoStack.pop();
        if (lastEvent.type === "draw-event") {
            let item = new Path();
            item.importJSON(lastEvent.data);
            sketchController.stack.undoStack.push(lastEvent);
        }
        if (lastEvent.type === "delete-event") {
            let pathList = [];
            lastEvent.data.map((path) => {
                let pathCopy = path.exportJSON();
                path.remove();
                pathList.push(pathCopy);
            });
            sketchController.stack.undoStack.push({
                type: "delete-event",
                data: pathList,
            }); // need to store a json to redraw
        }
        if (lastEvent.type === "erase-event") {
            let beforeErase = userLayer.exportJSON();
            userLayer.clear();
            let eraseItems = userLayer.importJSON(lastEvent.data);
            sketchController.stack.undoStack.push({
                type: "erase-event",
                data: beforeErase, //use ref
            });
        }

        sketchController.svg = paper.project.exportSVG({
            asString: true,
        });
        logger.event("redo-" + lastEvent.type);
    }
});
document.getElementById("save").addEventListener("click", () => {
    sketchController.svg = paper.project.exportSVG({
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
});
document.getElementById("width-slider").oninput = function() {
    sketchController.strokeWidth = this.value;
    const point = document.getElementById("point-size");
    point.style.width = sketchController.strokeWidth + "px";
    point.style.height = sketchController.strokeWidth + "px";
    getSelectedPaths().forEach(
        (item) => (item.strokeWidth = sketchController.strokeWidth)
    );
    // setPenMode("pen", document.getElementById("pen"));
};

selectGroup = null;

rotateSlider.oninput = function() {
    hideSelectUI(false);
    let r = this.value;
    sketchController.transformGroup.rotation = r;
    let items = getSelectedPaths();
    fitToSelection(items, "rotating");
    updateSelectUI();
};

rotateNumber.oninput = function() {
    hideSelectUI(false);
    let r = this.value;
    sketchController.transformGroup.rotation = r;
    let items = getSelectedPaths();
    fitToSelection(items, "rotating");
    updateSelectUI();
};

scaleSlider.oninput = function() {
    // if (sketchController.boundingBox.data.state === "rotating") {
    hideSelectUI(false);
    let selectedPaths = getSelectedPaths(); // all selected

    for (child of selectedPaths) {
        child.applyMatrix = false;
        child.scaling = this.value / 5;
    }
    fitToSelection(selectedPaths, "scaling");
    updateSelectUI();
};

scaleNumber.oninput = function() {
    hideSelectUI(false);
    let selectedPaths = getSelectedPaths(); // all selected

    for (child of selectedPaths) {
        child.applyMatrix = false;
        child.scaling = this.value / 5;
    }
    fitToSelection(selectedPaths, "scaling");
    updateSelectUI();
};

opacitySlider.oninput = function() {
    sketchController.opacity = this.value / 100;
    console.log(sketchController.opacity);
    getRGBA();
    getSelectedPaths().forEach(
        (item) => (item.opacity = sketchController.opacity)
    );
};

// document.getElementById("autonomy-slider").oninput = function() {
//     let val = 11 - this.value;
//     // 0-10
//     sketchController.randomRange = val; //used for adding
// };

// document.getElementById("enthusiasm-slider").oninput = function() {
//     let val = 11 - this.value;
//     let label = document.getElementById("speed-text");
//     if (val === 10) {
//         //max time
//         sketchController.doneSketching = null; // never add
//         label.innerHTML = "I'll leave it to you...";
//     } else {
//         sketchController.doneSketching = val * 1.3 * 1000 + 2000;
//         if (val < 7) label.innerHTML = "I'll help if you're stuck...";
//         if (val < 4) label.innerHTML = "Let's draw together!";
//     }
// };

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
    if (sketchController.numTraces > 1) {
        showTraceHistoryFrom(historyIndex);
    } else {
        userLayer.clear();
        let svg = sketchController.stack.historyHolder[historyIndex].svg;
        parseFromSvg(svg, userLayer, true);
        sketchController.svg = paper.project.exportSVG({
            asString: true,
        });
    }

    sketchController.svg = paper.project.exportSVG({
        asString: true,
    });
};

palette.addEventListener("click", () => {
    showHide(artControls);
    palette.classList.toggle("panel-open");
});

// let typingTimer;
// let doneTypingInterval = 1000;
prompt.addEventListener("input", (e) => {
    sketchController.prompt = e.target.value;
    aiMessage.innerHTML = `Sure! I can draw ${sketchController.prompt}...`;

    document
        .querySelectorAll(".inactive-section")
        .forEach((elem) => elem.classList.remove("inactive-section"));
});

// TODO Refactor into the setActionUI switch statement using states
// Draw
document.getElementById("draw").addEventListener("click", () => {
    if (
        sketchController.drawState === "inactive" ||
        sketchController.drawState === "stop"
    ) {
        sketchController.draw();
    }
});

// Refine
document.getElementById("refine").addEventListener("click", () => {
    if (
        sketchController.drawState === "inactive" ||
        sketchController.drawState === "stop"
    ) {
        sketchController.draw(false, null, true);
    }
});

// // Trial / Brainstorm

// Stop
stopButton.addEventListener("click", () => {
    if (sketchController.activeStates.includes(sketchController.drawState)) {
        //active
        sketchController.stop();
    } else {
        sketchController.redraw();
    }
});

// Redraw
document.getElementById("redraw").addEventListener("click", () => {
    if (sketchController.drawState === "stop") {
        sketchController.redraw();
    }
});
// // Contine
// actionControls[6].addEventListener("click", () => {
//     if (sketchController.drawState === "stop") {
//         sketchController.continue();
//     }
// });

// Old generate
// document.getElementById("brainstorm").addEventListener("click", () => {
//     if (sketchController.drawState === "inactive" || sketchController.drawState === "stop") {
//         sketchController.generate();
//     }
// });

document.getElementById("go-back").addEventListener("click", () => {
    if (sketchController.drawState === "stop") {
        sketchController.goBack();
    }
});

document.getElementById("brainstorm").addEventListener("click", () => {
    if (noPrompt()) {
        openModal({
            title: "Type a prompt first!",
            message: "You need a target for AI exemplars.",
        });
        return;
    } else {
        const myNode = document.getElementById("explore-sketches");
        const total =
            sketchController.sketchScopeIndex + Math.floor(Math.random() * 5);
        // TO DO: Clean up old scopes (now unused)
        for (let i = 0; i < 4; i++) {
            myNode.removeChild(myNode.firstChild);
            if (sketchController.sketchScopeIndex > total) {
                let newElem = createExemplar(false); //don't increase the number of scopes
                myNode.appendChild(newElem);
                newElem.classList.add("inactive-exemplar");
            } else {
                let newElem = createExemplar(false, sketchController.sketchScopeIndex);
                myNode.appendChild(newElem);
                sketchController.drawExemplar(sketchController.sketchScopeIndex); // No, allow the index to create so the listener can stop it.
                sketchController.sketchScopeIndex += 1;
            }
        }
    }
});

// Control panel
artControls.onmousedown = (e) => {
    if (window.innerWidth > 650) {
        let content;
        document.querySelectorAll(".tab-item").forEach((tab) => {
            if (tab.classList.contains("active-tab")) {
                if (tab.id === "collab-tab") {
                    content = document.getElementById("ai-content");
                } else {
                    content = document.getElementById("style-content");
                }
            }
        });
        // content = document.getElementById("style-content");

        let bounds = content.getBoundingClientRect();
        e = e || window.event;
        pos3 = e.clientX;
        pos4 = e.clientY;
        if (
            pos3 < bounds.left ||
            pos3 > bounds.right ||
            pos4 < bounds.top ||
            pos4 > bounds.bottom
        ) {
            document.onmouseup = closeDragElement;
            document.onmousemove = (e) => elementDrag(e, artControls);
        }
    }
};

sketchBook.onmousedown = (e) => {
    if (window.innerWidth > 650) {
        let content = document.getElementById("sketchbook-content");
        let bounds = content.getBoundingClientRect();
        e = e || window.event;
        pos3 = e.clientX;
        pos4 = e.clientY;
        if (
            pos3 < bounds.left ||
            pos3 > bounds.right ||
            pos4 < bounds.top ||
            pos4 > bounds.bottom
        ) {
            document.onmouseup = closeDragElement;
            document.onmousemove = (e) => elementDrag(e, sketchBook);
        }
    }
};

function elementDrag(e, item) {
    e = e || window.event;
    // e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    item.style.top = item.offsetTop - pos2 + "px";
    item.style.left = item.offsetLeft - pos1 + "px";
}

function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
}

document.querySelectorAll(".tab-item").forEach((tab) => {
    tab.addEventListener("click", () => {
        if (!tab.classList.contains("active-tab")) {
            document
                .querySelectorAll(".tab-item")
                .forEach((tabItem) => tabItem.classList.toggle("active-tab"));

            if (tab.id == "style-tab") {
                document.getElementById("style-content").parentElement.style.display =
                    "block";
                document.getElementById("ai-content").parentElement.style.display =
                    "none";
            } else {
                document.getElementById("style-content").parentElement.style.display =
                    "none";
                document.getElementById("ai-content").parentElement.style.display =
                    "block";
            }
        }
    });
});

document.getElementById("scrapbook").addEventListener("click", () => {
    showHide(sketchBook);
    document.getElementById("scrapbook").classList.toggle("panel-open");
});

// document.querySelectorAll(".card-icon-background").forEach((elem) => {
//     elem.addEventListener("click", () => {
//         console.log("test");
//         elem.parentElement.parentElement.remove();
//     });
// });

document.getElementById("save-sketch").addEventListener("click", () => {
    let jsonGroup = exportToExemplar();
    let sketchCountIndex = sketchController.sketchScopeIndex;
    console.log(sketchCountIndex);
    let newElem = createExemplar(true, sketchCountIndex);
    let toCanvas = exemplarScope.projects[sketchCountIndex];
    let imported = toCanvas.activeLayer.importJSON(jsonGroup);
    imported.position = new Point(exemplarSize / 2, exemplarSize / 2);
    document.getElementById("exemplar-grid").appendChild(newElem);
    sketchController.sketchScopeIndex += 1;
});

const autoButton = document.getElementById("autodraw-button");
autoButton.addEventListener("click", () => {
    if (sketchController.doneSketching !== null) {
        sketchController.doneSketching = null; // never add
        autoButton.innerHTML = "I'll leave it to you...";
    } else {
        autoButton.innerHTML = "Collab draw!";
        sketchController.doneSketching = 500;
    }
    autoButton.classList.toggle("inactive-pill");
});

document.getElementById("show-all-paths").addEventListener("click", () => {
    sketchController.showAllLines = !sketchController.showAllLines;
    document.getElementById("show-all-paths").classList.toggle("inactive-pill");
});

// document.getElementById("use-squiggles").addEventListener("change", (event) => {
//     sketchController.initRandomCurves = !sketchController.initRandomCurves;
//     let container = document.getElementById("contain-num-squiggles");
//     if (container.style.display === "none") {
//         container.style.display = "contents";
//     } else {
//         container.style.display = "none";
//     }
// });

// document.getElementById("num-squiggles").oninput = function() {
//     sketchController.numRandomCurves = parseInt(this.value);
// };

document.getElementById("num-traces").oninput = function() {
    sketchController.numTraces = parseInt(this.value);
};

const respectSlider = document.getElementById("respect-slider");
let lastFixation = sketchController.useFixation;

respectSlider.oninput = function() {
    sketchController.useFixation = parseInt(this.value);
};

respectSlider.onmousedown = () => {
    pauseActiveDrawer();
    lastFixation = sketchController.useFixation;
};

respectSlider.onmouseup = () => {
    if (liveCollab) {
        if (sketchController.useFixation !== lastFixation) {
            sketchController.continueSketch();
        }
        liveCollab = false;
    }
};

// document.getElementById("set-background").onclick = function() {
//     canvas.style.backgroundColor = sketchController.strokeColor;
// };

// document.getElementById("moodboard-cross").addEventListener("click", () => {
//     if (!moodboard.style.display || moodboard.style.display === "none") {
//         moodboard.style.display = "block";
//     } else {
//         moodboard.style.display = "none";
//     }
// });

// LOAD UI

// Random partial sketch
// const partial = userLayer.importSVG(sketches[Math.floor(Math.random() * 3)]);
// partial.scale(1000);
// // TO DO: Scale to canvas size
// partial.set({
//     position: new Point(540, 540),
//     strokeWidth: sketchController.strokeWidth,
//     opacity: sketchController.opacity,
//     strokeCap: "round",
//     strokeJoin: "round",
// });

// partial.getItems().forEach((item) => userLayer.addChild(item.clone()));
// userLayer.firstChild.remove();
// partial.remove();
// console.log(userLayer.firstChild.remove());
// console.log(userLayer.firstChild.remove());
// console.log(userLayer);

// sketchController.svg = paper.project.exportSVG({
//     asString: true,
// });

// /////////

const picker = new Picker({
    parent: document.getElementById("color-picker"),
    popup: false,
    alpha: false,
    defaultColor: "#0cf",
    editor: false,
    editorFormat: "hex", // or 'rgb', 'hsl'
});

picker.setColor(sketchController.strokeColor);
picker.onChange = (color) => {
    sketchController.strokeColor = color.rgbaString;
    getRGBA();
    getSelectedPaths().forEach(
        (item) => (item.strokeColor = sketchController.strokeColor)
    );
    // setPenMode("pen", document.getElementById("pen"));
};

setActionUI("inactive");

for (let i = 0; i < 4; i++) {
    let newElem = createExemplar(false);
    //creates unneeded exemplarScope
    // let newElem = exemplarTemplate.cloneNode(reusableExemplar);
    // let exemplarCanvas = newElem.querySelector("canvas");
    // exemplarCanvas.width = exemplarSize;
    // exemplarCanvas.height = exemplarSize;
    // newElem.id = `default-sketch-item-${i}`;
    newElem.classList.add("inactive-exemplar");
    document.getElementById("explore-sketches").appendChild(newElem);
}