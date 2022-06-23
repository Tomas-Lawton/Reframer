function dragover(e) {
    e.preventDefault();
}

function dragentercanvas(e) {
    e.preventDefault();
    canvas.classList.add("drop-ready");
}

function dropCanvas(e) {
    canvas.classList.remove("drop-ready");
    let i = e.dataTransfer.getData("text/plain");
    controller.sketches[i].import(mainSketch);
}

function dragleavecanvas(e) {
    e.preventDefault();
    canvas.classList.remove("drop-ready");
}

sketchContainer.addEventListener("dragover", dragover);
sketchContainer.addEventListener("dragenter", dragentercanvas);
sketchContainer.addEventListener("dragleave", dragleavecanvas);
sketchContainer.addEventListener("drop", dropCanvas);

function dragoverhover(e) {
    e.preventDefault();
    sketchGrid.classList.add("drop-ready");
    sketchGrid.classList.remove("basic-background");
}

function dragleavesketch(e) {
    e.preventDefault();
    sketchGrid.classList.remove("drop-ready");
    sketchGrid.classList.add("basic-background");
}

function dropSketch(e) {
    sketchGrid.classList.remove("drop-ready");
    const sketchCountIndex = e.dataTransfer.getData("text/plain");
    if (document.querySelector(`#AI-sketch-item-${sketchCountIndex}`)) {
        mainSketch.saveStatic(
            controller.sketches[sketchCountIndex].extractJSON(),
            controller.sketches[sketchCountIndex].num
        );
    }
}

sketchGrid.addEventListener("dragover", dragoverhover);
// sketchGrid.addEventListener("dragenter", dragentersketches);
sketchGrid.addEventListener("dragleave", dragleavesketch);
sketchGrid.addEventListener("drop", dropSketch);

// Drawing Controls
document.querySelectorAll(".pen-mode").forEach((elem) => {
    elem.addEventListener("click", () => {
        setPenMode(elem.id, elem);
    });
});
document.querySelectorAll(".swatch").forEach((elem) => {
    elem.addEventListener("click", () => {
        let col = window.getComputedStyle(elem).backgroundColor;
        controller.opacity = 1;
        opacitySlider.value = 100;
        controller.strokeColor = col;
        getSelectedPaths().forEach((path) => (path.strokeColor = col));
        picker.setColor(col);
    });
});

document.getElementById("delete").addEventListener("click", () =>
    openModal({
        title: "Clearing Canvas",
        message: "Are you sure you want to delete your drawing?",
        confirmAction: () => {
            // Save before clearing
            mainSketch.svg = paper.project.exportSVG({
                asString: true,
            });
            logger.event("clear-sketch");

            controller.lastPrompt = null;
            userLayer.clear();
            modal.style.display = "none";
            mainSketch.userPathList = [];
            updateSelectUI();
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

copyHandler.addEventListener("click", (e) => {
    let offset = controller.boundingBox.bounds.width;
    let paths = getSelectedPaths();
    hideSelectUI(false);
    paths.forEach((path) => {
        let duplicate = path.clone();
        duplicate.position.x += offset;
        mainSketch.userPathList.push(duplicate);
        duplicate.selected = true;
    });

    mainSketch.svg = paper.project.exportSVG({
        asString: true,
    });
    logger.event("duplicate-selection");

    fitToSelection(getSelectedPaths(), "moving");
    updateSelectUI();
});

// reviseHandler.addEventListener("click", (e) => {
//     if (
//         controller.drawState === "inactive" ||
//         controller.drawState === "stop"
//     ) {
//         controller.draw(false, null, true);
//     }
// });

// initialiseHandler.addEventListener("click", (e) => {
//     const remove = userLayer.getItems().filter((path) => !path.selected);
//     remove.forEach((item) => item.remove());
//     let items = getSelectedPaths();
//     fitToSelection(items, "moving");
//     updateSelectUI();
// });

document.getElementById("begin").addEventListener("click", () => {
    document.getElementById("sliding-overlay").style.bottom = "100%";
});

document.getElementById("undo").addEventListener("click", () => {
    if (controller.stack.undoStack.length > 0) {
        const lastEvent = controller.stack.undoStack.pop();
        if (lastEvent.type === "draw-event") {
            let thisPath; //json from redo, otherwise path
            try {
                let temp = new Path();
                thisPath = temp.importJSON(lastEvent.data);
            } catch (e) {
                thisPath = lastEvent.data;
            }
            let copy = thisPath.exportJSON();
            controller.stack.redoStack.push({
                type: "draw-event",
                data: copy,
            }); //so remove does not remove reference
            thisPath.remove();
        }
        if (lastEvent.type === "delete-event") {
            let afterDelete = userLayer.exportJSON();
            userLayer.clear();
            userLayer.importJSON(lastEvent.data);
            let addedGroup = userLayer.lastChild;
            if (addedGroup instanceof Group) {
                addedGroup.children.forEach((child) =>
                    userLayer.addChild(child.clone())
                );
                addedGroup.remove();
            }
            controller.stack.redoStack.push({
                type: "delete-event",
                data: afterDelete, //use ref
            });
        }
        if (lastEvent.type === "erase-event") {
            let afterErase = userLayer.exportJSON();
            userLayer.clear();
            userLayer.importJSON(lastEvent.data);
            controller.stack.redoStack.push({
                type: "erase-event",
                data: afterErase, //use ref
            });
        }

        mainSketch.svg = paper.project.exportSVG({
            asString: true,
        });
        logger.event("undo-" + lastEvent.type);
    }
});
document.getElementById("redo").addEventListener("click", () => {
    if (controller.stack.redoStack.length > 0) {
        const lastEvent = controller.stack.redoStack.pop();
        if (lastEvent.type === "draw-event") {
            let item = new Path();
            item.importJSON(lastEvent.data);
            controller.stack.undoStack.push(lastEvent);
        }
        if (lastEvent.type === "delete-event") {
            let beforeDelete = userLayer.exportJSON();
            userLayer.clear();
            userLayer.importJSON(lastEvent.data);
            controller.stack.undoStack.push({
                type: "delete-event",
                data: beforeDelete, //use ref
            });
        }
        if (lastEvent.type === "erase-event") {
            let beforeErase = userLayer.exportJSON();
            userLayer.clear();
            userLayer.importJSON(lastEvent.data);
            controller.stack.undoStack.push({
                type: "erase-event",
                data: beforeErase, //use ref
            });
        }

        mainSketch.svg = paper.project.exportSVG({
            asString: true,
        });
        logger.event("redo-" + lastEvent.type);
    }
});
document.getElementById("save").addEventListener("click", () => {
    downloadSketch();
});

document.getElementById("width-slider").oninput = function() {
    setPointSize(this.value);
};

rotateSlider.oninput = function() {
    rotateSelectGroup(controller.transformGroup, this.value);
};

scaleSlider.oninput = function() {
    scaleSelectGroup(controller.transformGroup, this.value / 5);
};

rotateNumber.oninput = function() {
    rotateSelectGroup(controller.transformGroup, this.value);
};

scaleNumber.oninput = function() {
    scaleSelectGroup(controller.transformGroup, this.value / 5);
};

opacitySlider.oninput = function() {
    controller.opacity = this.value / 100;

    if (controller.transformGroup) {
        controller.transformGroup.children.forEach(
            (child) => (child.opacity = this.value / 100)
        );
    }
    let rgba = getRGBA();
    document.getElementById("pen-color").style.background = rgba;
    document.getElementById("point-size").style.background = rgba;
};

// document.getElementById("autonomy-slider").oninput = function() {
//     let val = 11 - this.value;
//     // 0-10
//     controller.addPaths = val; //used for adding
// };

document
    .getElementById("circle-small")
    .parentElement.addEventListener("click", (e) => {
        setPointSize(document.getElementById("circle-small").offsetWidth);
        setPenMode("pen", pen);
    });

document
    .getElementById("circle-med")
    .parentElement.addEventListener("click", (e) => {
        setPointSize(document.getElementById("circle-med").offsetWidth);
        setPenMode("pen", pen);
    });

document
    .getElementById("circle-large")
    .parentElement.addEventListener("click", (e) => {
        setPointSize(document.getElementById("circle-large").offsetWidth);
        setPenMode("pen", pen);
    });

// document.getElementById("settings").addEventListener("click", () => {
//     openModal({
//         title: "Advanced",
//         message: "Change the drawing behaviour and UI.",
//         ui: document.getElementById("settings-ui"),
//     });
// });

timeKeeper.oninput = function() {
    if (this.value === 0) return; // 0 is pre-generation state
    historyIndex = this.value;
    userLayer.clear();
    if (controller.numTraces > 1) {
        showTraceHistoryFrom(historyIndex);
    } else {
        let stored = controller.stack.historyHolder[historyIndex];
        mainSketch.svg = parseFromSvg(
            1,
            stored.svg,
            stored.num,
            userLayer,
            false // don't reapply opacity
        );
    }
    mainSketch.svg = paper.project.exportSVG({
        asString: true,
    });
};

palette.addEventListener("click", () => {
    showHide(controlPanel);
    palette.classList.toggle("panel-open");
});

prompt.addEventListener("input", (e) => {
    controller.prompt = e.target.value;
    aiMessage.innerHTML = `Sure! I can draw ${controller.prompt}...`;
    document
        .querySelectorAll(".inactive-section")
        .forEach((elem) => elem.classList.remove("inactive-section"));
});

document.getElementById("draw").addEventListener("click", () => {
    if (socketConnected) {
        controller.draw();
    }
});

document.getElementById("inspire").addEventListener("click", () => {
    if (socketConnected) {
        if (noPrompt()) {
            openModal({
                title: "Type a prompt first!",
                message: "You need a target for AI sketchs.",
            });
            return;
        } else {
            // TO DO: Clean up old scopes (now unused) // controller.inspireScopes
            const total = controller.sketchScopeIndex + Math.floor(Math.random() * 5);
            for (let i = 0; i < 4; i++) {
                explorer.removeChild(explorer.firstChild);
                if (controller.sketchScopeIndex > total) {
                    let sketch = new Sketch(
                        null,
                        defaults,
                        mainSketch.userPathList.length
                    );
                    let newElem = sketch.renderMini();
                    controller.inspireScopes.push(controller.sketchScopeIndex);
                    explorer.appendChild(newElem);
                    newElem.classList.add("inactive-sketch");
                } else {
                    let sketch = new Sketch(
                        controller.sketchScopeIndex,
                        sketchScope,
                        mainSketch.userPathList.length, //based on current
                        "AI"
                    );
                    let newElem = sketch.renderMini();
                    controller.inspireScopes.push(controller.sketchScopeIndex);
                    explorer.appendChild(newElem);
                    controller.newExploreSketch(controller.sketchScopeIndex);
                    controller.sketchScopeIndex += 1;
                }
            }
            controller.clipDrawing = true;
            setActionUI("explore");
        }
    }
});

stopButton.addEventListener("click", () => {
    if (socketConnected) {
        if (
            controller.drawState === "drawing" ||
            controller.drawState === "continuing"
        ) {
            controller.stop(); //flag
            controller.clipDrawing = false;
        } else if (
            controller.drawState === "explore" ||
            controller.drawState === "continue-explore"
        ) {
            aiMessage.innerHTML = "All done! What should we draw next?";
            aiMessage.classList.add("typed-out");
            setActionUI("stopSingle");
            killExploratorySketches();
            controller.clipDrawing = false;
        }
    }
});

document.getElementById("prune").addEventListener("click", () => {
    if (socketConnected) {
        if (
            controller.drawState === "stop" ||
            controller.drawState === "stop-prune"
        ) {
            // after  draw
            controller.prune();
        }
    }
});

document.getElementById("go-back").addEventListener("click", () => {
    if (controller.drawState === "stop") {
        let stored = controller.stack.historyHolder[1];
        timeKeeper.value = 1;
        parseFromSvg(1, stored.svg, stored.num, userLayer);
        mainSketch.svg = paper.project.exportSVG({
            asString: true,
        });
    }
});

// Control panel
controlPanel.onmousedown = (e) => {
    if (window.innerWidth > 700) {
        let content;
        if (useAI) {
            document.querySelectorAll(".tab-item").forEach((tab) => {
                if (tab.classList.contains("active-tab")) {
                    if (tab.id === "collab-tab") {
                        content = document.getElementById("ai-content");
                    } else {
                        content = document.getElementById("style-content");
                    }
                }
            });
        } else {
            content = document.getElementById("style-content");
        }

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
            document.onmousemove = (e) => elementDrag(e, controlPanel);
        }
    }
};

document.getElementById("explore-margin").onmousedown = (e) => {
    if (window.innerWidth > 700) {
        let content = document.getElementById("explore-sketches");
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

document.getElementById("static-margin").onmousedown = (e) => {
    if (window.innerWidth > 700) {
        let content = document.getElementById("static-sketches");
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
//         elem.parentElement.parentElement.remove();
//     });
// });

document.getElementById("save-sketch").addEventListener("click", () => {
    unpackGroup();
    hideSelectUI();
    mainSketch.saveStatic(
        mainSketch.extractScaledJSON(mainSketch, 1 / scaleRatio), //adds as backup
        mainSketch.userPathList.length
    );
    logger.event("to-sketchbook");
});

const autoButton = document.getElementById("autodraw-button");
autoButton.addEventListener("click", () => {
    if (controller.doneSketching !== null) {
        controller.doneSketching = null; // never add
        autoButton.innerHTML = "Solo draw";
    } else {
        autoButton.innerHTML = "Collab draw!";
        controller.doneSketching = 500;
    }
    autoButton.classList.toggle("inactive-pill");
});

// document.getElementById("show-all-paths").addEventListener("click", () => {
//     controller.showAllLines = !controller.showAllLines;
//     document.getElementById("show-all-paths").classList.toggle("inactive-pill");
// });

document.getElementById("num-squiggles").oninput = function() {
    controller.maxCurves = parseInt(this.value);
    setLineLabels(userLayer);
};

document.getElementById("num-traces").oninput = function() {
    controller.numTraces = parseInt(this.value);
};

document.getElementById("overwrite").addEventListener("click", () => {
    if (allowOverwrite) {
        document.getElementById("overwrite").innerHTML = "Copy";
    } else {
        document.getElementById("overwrite").innerHTML = "Overwrite";
    }
    document.getElementById("overwrite").classList.toggle("inactive-pill");
    allowOverwrite = !allowOverwrite;
});

const respectSlider = document.getElementById("respect-slider");
let lastFixation = controller.useFixation;

respectSlider.oninput = function() {
    controller.useFixation = parseInt(this.value);
    let msg = controller.useFixation > 2 ? "More" : "Less";
    document.getElementById("fix-label").innerHTML = msg;
};

respectSlider.onmousedown = () => {
    pauseActiveDrawer();
    lastFixation = controller.useFixation;
};

respectSlider.onmouseup = () => {
    if (liveCollab) {
        if (controller.useFixation !== lastFixation) {
            controller.continueSketch();
        }
        liveCollab = false;
    }
};

// document.getElementById("set-background").onclick = function() {
//     canvas.style.backgroundColor = controller.strokeColor;
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
if (!useAI) {
    const scaleTo = userLayer.view.viewSize.width;
    const idx = Math.floor(Math.random() * partialSketches.length);
    // const idx = 5;
    console.log(idx);
    const partial = partialSketches[idx][0];
    const drawPrompt = partialSketches[idx][1];
    document.getElementById("partial-message").innerHTML = drawPrompt;

    var loadedPartial = userLayer.importSVG(partial);
    loadedPartial.set({
        opacity: controller.opacity,
        strokeCap: "round",
        strokeJoin: "round",
    });
    loadedPartial.getItems().forEach((item) => {
        if (item instanceof Path) {
            let newElem = userLayer.addChild(item.clone());
            mainSketch.userPathList.push(newElem);
        }
    });
    loadedPartial.remove();
    console.log(userLayer);

    scaleGroup(userLayer, scaleTo);

    mainSketch.svg = paper.project.exportSVG({
        asString: true,
    });
}

const picker = new Picker({
    parent: document.getElementById("color-picker"),
    popup: false,
    alpha: false,
    defaultColor: "#0cf",
    editor: false,
    editorFormat: "hex", // or 'rgb', 'hsl'
});

picker.setColor(controller.strokeColor);
picker.onChange = (color) => {
    controller.strokeColor = color.rgbaString;
    getSelectedPaths().forEach(
        (item) => (item.strokeColor = controller.strokeColor)
    );
    let rgba = getRGBA();
    document.getElementById("pen-color").style.background = rgba;
    document.getElementById("point-size").style.background = rgba;
};

setLineLabels(userLayer);

setActionUI("inactive");

const defaults = new PaperScope();
defaults.activate();
for (let i = 0; i < 4; i++) {
    let sketch = new Sketch(null, defaults, null);
    let newElem = sketch.renderMini();
    // controller.sketchScopeIndex += 1; //remove later
    newElem.classList.add("inactive-sketch");
    document.getElementById("explore-sketches").appendChild(newElem);
}

// sketchBook.style.left =
//     window.innerWidth - sketchBook.getBoundingClientRect().width - 5 + "px";
sketchBook.style.display = "none";
// controlPanel.style.left = 5 + "px";
// controlPanel.style.display = "none";
// if (window.innerWidth < 700) {
//     document
//         .getElementById("content")
//         .appendChild(document.getElementById("style-content"));
// }

if (window.innerWidth <= 700 || window.innerWidth >= 1000) {
    document
        .querySelectorAll(".hide-swatch")
        .forEach((elem) => elem.classList.remove("hide-swatch"));
}

if (window.innerWidth <= 700) {
    penControls.appendChild(document.getElementById("scrapbook"));
    penControls.appendChild(document.getElementById("delete"));

    let saveText = document.createElement("p");
    saveText.innerHTML = "Done";
    document.getElementById("top-action-right").prepend(saveText);

    document.getElementById("save").removeEventListener("click", () => {
        downloadSketch();
    });
    document
        .getElementById("save")
        .parentElement.addEventListener("click", () => {
            downloadSketch();
        });
}