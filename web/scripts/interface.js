function dragover(e) {
    e.preventDefault();
}

function dragentercanvas(e) {
    e.preventDefault();
    canvas.classList.add("drop-ready");
}

function dropCanvas(e) {
    canvas.classList.remove("drop-ready");
    importStaticSketch(e.dataTransfer.getData("text/plain"));
}

function dragleavecanvas(e) {
    e.preventDefault();
    canvas.classList.remove("drop-ready");
}

sketchContainer.addEventListener("dragover", dragover);
sketchContainer.addEventListener("dragenter", dragentercanvas);
sketchContainer.addEventListener("dragleave", dragleavecanvas);
sketchContainer.addEventListener("drop", dropCanvas);

function dragentersketches(e) {
    e.preventDefault();
    if (
        sketchController.scopeRef.includes(e.dataTransfer.getData("text/plain"))
    ) {
        sketchGrid.classList.add("drop-ready");
    }
}

function dragleavesketch(e) {
    e.preventDefault();
    sketchGrid.classList.remove("drop-ready");
}

function dropSketch(e) {
    sketchGrid.classList.remove("drop-ready");
    const sketchCountIndex = e.dataTransfer.getData("text/plain");
    let dragItem = document.querySelector(`#AI-sketch-item-${sketchCountIndex}`);
    if (dragItem) {
        toSketchbook(sketchCountIndex); //backup current
    }
}

sketchGrid.addEventListener("dragover", dragover);
sketchGrid.addEventListener("dragenter", dragentersketches);
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
        sketchController.opacity = 1;
        opacitySlider.value = 100;
        sketchController.strokeColor = col;
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
            sketchController.svg = paper.project.exportSVG({
                asString: true,
            });
            logger.event("clear-sketch");

            sketchController.lastPrompt = null;
            userLayer.clear();
            modal.style.display = "none";
            sketchController.userPaths = [];
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
    let offset = sketchController.boundingBox.bounds.width;
    let paths = getSelectedPaths();
    hideSelectUI(false);
    paths.forEach((path) => {
        let duplicate = path.clone();
        duplicate.position.x += offset;
        sketchController.userPaths.push(duplicate);
        duplicate.selected = true;
    });

    sketchController.svg = paper.project.exportSVG({
        asString: true,
    });
    logger.event("duplicate-selection");

    fitToSelection(getSelectedPaths(), "moving");
    updateSelectUI();
});

// reviseHandler.addEventListener("click", (e) => {
//     if (
//         sketchController.drawState === "inactive" ||
//         sketchController.drawState === "stop"
//     ) {
//         sketchController.draw(false, null, true);
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
            sketchController.stack.redoStack.push({
                type: "delete-event",
                data: afterDelete, //use ref
            });
        }
        if (lastEvent.type === "erase-event") {
            let afterErase = userLayer.exportJSON();
            userLayer.clear();
            userLayer.importJSON(lastEvent.data);
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
            let beforeDelete = userLayer.exportJSON();
            userLayer.clear();
            userLayer.importJSON(lastEvent.data);
            sketchController.stack.undoStack.push({
                type: "delete-event",
                data: beforeDelete, //use ref
            });
        }
        if (lastEvent.type === "erase-event") {
            let beforeErase = userLayer.exportJSON();
            userLayer.clear();
            userLayer.importJSON(lastEvent.data);
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
    downloadSketch();
});

document.getElementById("width-slider").oninput = function() {
    setPointSize(this.value);
};

rotateSlider.oninput = function() {
    rotateSelectGroup(sketchController.transformGroup, this.value);
};

scaleSlider.oninput = function() {
    scaleSelectGroup(sketchController.transformGroup, this.value / 5);
};

rotateNumber.oninput = function() {
    rotateSelectGroup(sketchController.transformGroup, this.value);
};

scaleNumber.oninput = function() {
    scaleSelectGroup(sketchController.transformGroup, this.value / 5);
};

opacitySlider.oninput = function() {
    sketchController.opacity = this.value / 100;

    if (sketchController.transformGroup) {
        sketchController.transformGroup.children.forEach(
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
//     sketchController.addPaths = val; //used for adding
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
    if (sketchController.numTraces > 1) {
        showTraceHistoryFrom(historyIndex);
    } else {
        let stored = sketchController.stack.historyHolder[historyIndex];
        sketchController.svg = parseFromSvg(
            1,
            stored.svg,
            stored.num,
            userLayer,
            false // don't reapply opacity
        );
    }
    sketchController.svg = paper.project.exportSVG({
        asString: true,
    });
};

palette.addEventListener("click", () => {
    showHide(controlPanel);
    palette.classList.toggle("panel-open");
});

prompt.addEventListener("input", (e) => {
    sketchController.prompt = e.target.value;
    aiMessage.innerHTML = `Sure! I can draw ${sketchController.prompt}...`;
    document
        .querySelectorAll(".inactive-section")
        .forEach((elem) => elem.classList.remove("inactive-section"));
});

document.getElementById("draw").addEventListener("click", () => {
    if (socketConnected) {
        sketchController.draw();
    }
});

document.getElementById("inspire").addEventListener("click", () => {
    if (socketConnected) {
        if (noPrompt()) {
            openModal({
                title: "Type a prompt first!",
                message: "You need a target for AI exemplars.",
            });
            return;
        } else {
            // TO DO: Clean up old scopes (now unused) // sketchController.scopeRef
            const total =
                sketchController.sketchScopeIndex + Math.floor(Math.random() * 5);
            for (let i = 0; i < 4; i++) {
                explorer.removeChild(explorer.firstChild);
                if (sketchController.sketchScopeIndex > total) {
                    let newElem = createExemplar(defaults, false);
                    sketchController.scopeRef.push(sketchController.sketchScopeIndex);
                    explorer.appendChild(newElem);
                    newElem.classList.add("inactive-exemplar");
                } else {
                    let newElem = createExemplar(
                        exemplarScope,
                        false,
                        sketchController.sketchScopeIndex
                    );
                    sketchController.scopeRef.push(sketchController.sketchScopeIndex);
                    explorer.appendChild(newElem);
                    sketchController.newExploreSketch(sketchController.sketchScopeIndex);
                    sketchController.sketchScopeIndex += 1;
                }
            }
            sketchController.clipDrawing = true;
            setActionUI("explore");
        }
    }
});

stopButton.addEventListener("click", () => {
    if (socketConnected) {
        if (
            sketchController.drawState === "drawing" ||
            sketchController.drawState === "continuing"
        ) {
            sketchController.stop(); //flag
            sketchController.clipDrawing = false;
        } else if (
            sketchController.drawState === "explore" ||
            sketchController.drawState === "continue-explore"
        ) {
            aiMessage.innerHTML = "All done! What should we draw next?";
            aiMessage.classList.add("typed-out");
            setActionUI("stopSingle");
            killExploratorySketches();
            sketchController.clipDrawing = false;
        }
    }
});

document.getElementById("prune").addEventListener("click", () => {
    if (socketConnected) {
        if (
            sketchController.drawState === "stop" ||
            sketchController.drawState === "stop-prune"
        ) {
            // after  draw
            sketchController.prune();
        }
    }
});

document.getElementById("go-back").addEventListener("click", () => {
    if (sketchController.drawState === "stop") {
        let stored = sketchController.stack.historyHolder[1];
        timeKeeper.value = 1;
        parseFromSvg(1, stored.svg, stored.num, userLayer);
        sketchController.svg = paper.project.exportSVG({
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
    toSketchbook();
    logger.event("to-sketchbook");
});

const autoButton = document.getElementById("autodraw-button");
autoButton.addEventListener("click", () => {
    if (sketchController.doneSketching !== null) {
        sketchController.doneSketching = null; // never add
        autoButton.innerHTML = "Solo draw";
    } else {
        autoButton.innerHTML = "Collab draw!";
        sketchController.doneSketching = 500;
    }
    autoButton.classList.toggle("inactive-pill");
});

// document.getElementById("show-all-paths").addEventListener("click", () => {
//     sketchController.showAllLines = !sketchController.showAllLines;
//     document.getElementById("show-all-paths").classList.toggle("inactive-pill");
// });

document.getElementById("num-squiggles").oninput = function() {
    sketchController.maxCurves = parseInt(this.value);
    setLineLabels(userLayer);
};

document.getElementById("num-traces").oninput = function() {
    sketchController.numTraces = parseInt(this.value);
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
let lastFixation = sketchController.useFixation;

respectSlider.oninput = function() {
    sketchController.useFixation = parseInt(this.value);
    let msg = sketchController.useFixation > 2 ? "More" : "Less";
    document.getElementById("fix-label").innerHTML = msg;
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

const scaleGroup = (group, to) => {
    group.scale(to, new Point(0, 0));
    group.children.forEach((item, i) => {
        item.strokeWidth *= to;
    });
    return group;
};

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
        opacity: sketchController.opacity,
        strokeCap: "round",
        strokeJoin: "round",
    });
    loadedPartial.getItems().forEach((item) => {
        if (item instanceof Path) {
            let newElem = userLayer.addChild(item.clone());
            sketchController.userPaths.push(newElem);
        }
    });
    loadedPartial.remove();
    console.log(userLayer);

    scaleGroup(userLayer, scaleTo);

    sketchController.svg = paper.project.exportSVG({
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

picker.setColor(sketchController.strokeColor);
picker.onChange = (color) => {
    sketchController.strokeColor = color.rgbaString;
    getSelectedPaths().forEach(
        (item) => (item.strokeColor = sketchController.strokeColor)
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
    let newElem = createExemplar(defaults, false);
    // sketchController.sketchScopeIndex += 1; //remove later
    newElem.classList.add("inactive-exemplar");
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