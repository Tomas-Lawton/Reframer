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
        saveSketch(sketchCountIndex); //backup current
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
            sketchController.userPaths = [];
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

copyHandler.addEventListener("click", (e) => {
    // copy selection next to ???
});

reviseHandler.addEventListener("click", (e) => {
    if (
        sketchController.drawState === "inactive" ||
        sketchController.drawState === "stop"
    ) {
        sketchController.draw(false, null, true);
    }
});

initialiseHandler.addEventListener("click", (e) => {
    const remove = userLayer.getItems().filter((path) => !path.selected);
    remove.forEach((item) => item.remove());
    let items = getSelectedPaths();
    fitToSelection(items, "moving");
    updateSelectUI();

    // const svg = paper.project.exportSVG({
    //     asString: true,
    // });
    // sketchController.draw(false, svg); //breaks with group
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
    // REMOVE REFs to select box
    userLayer.getItems().forEach((path) => {
        path.selected = false;
    });
    // Remove the select box
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
    getRGBA();
    getSelectedPaths().forEach(
        (item) => (item.opacity = sketchController.opacity)
    );
};

document.getElementById("autonomy-slider").oninput = function() {
    let val = 11 - this.value;
    // 0-10
    sketchController.addPaths = val; //used for adding
};

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
    showHide(controlPanel);
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
// // Trial / Brainstorm

// Stop
stopButton.addEventListener("click", () => {
    if (sketchController.activeStates.includes(sketchController.drawState)) {
        //active
        sketchController.stop();
    }
    // else {
    //     sketchController.redraw();
    // }
});

document.getElementById("prune").addEventListener("click", () => {
    sketchController.prune();
});

// Redraw
// document.getElementById("redraw").addEventListener("click", () => {
//     if (sketchController.drawState === "stop") {
//         sketchController.redraw();
//     }
// });
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
        userLayer.clear();
        let svg = sketchController.stack.historyHolder[1].svg;
        timeKeeper.value = 1;
        parseFromSvg(svg, userLayer, true);
        sketchController.svg = paper.project.exportSVG({
            asString: true,
        });
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
        // TO DO: Clean up old scopes (now unused)
        //loop through old refs

        // console.log(sketchController.scopeRef);
        // for (let oldScope of sketchController.scopeRef) {
        //     oldScope.remove();
        // }
        // console.log(sketchController.scopeRef);

        const total =
            sketchController.sketchScopeIndex + Math.floor(Math.random() * 5);
        for (let i = 0; i < 4; i++) {
            explorer.removeChild(explorer.firstChild);
            if (sketchController.sketchScopeIndex > total) {
                let newElem = createExemplar(
                    exemplarScope,
                    false
                    // sketchController.sketchScopeIndex
                ); //don't increase the number of scopes
                // sketchController.scopeRef.push(
                //     exemplarScope.projects[sketchController.sketchScopeIndex]
                // );
                sketchController.scopeRef.push(sketchController.sketchScopeIndex);
                explorer.appendChild(newElem);
                newElem.classList.add("inactive-exemplar");
                // sketchController.sketchScopeIndex += 1;
            } else {
                let newElem = createExemplar(
                    exemplarScope,
                    false,
                    sketchController.sketchScopeIndex
                );
                // sketchController.scopeRef.push(
                //     exemplarScope.projects[sketchController.sketchScopeIndex]
                // );
                sketchController.scopeRef.push(sketchController.sketchScopeIndex);
                explorer.appendChild(newElem);
                sketchController.drawExemplar(sketchController.sketchScopeIndex);
                sketchController.sketchScopeIndex += 1;
            }
        }
        setActionUI("brainstorming-exemplars");
    }
});

// Control panel
controlPanel.onmousedown = (e) => {
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
            document.onmousemove = (e) => elementDrag(e, controlPanel);
        }
    }
};

document.getElementById("explore-margin").onmousedown = (e) => {
    if (window.innerWidth > 650) {
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
    if (window.innerWidth > 650) {
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
    saveSketch();
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

document.getElementById("num-squiggles").oninput = function() {
    sketchController.numRandomCurves = parseInt(this.value);
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
    document.getElementById("fix-label").innerHTML = sketchController.useFixation;
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
    group.scale(to);
    group.children.forEach((item, i) => {
        item.strokeWidth *= to;
    });
    return group;
};

// Random partial sketch
// (() => {
//     const scaleTo = userLayer.view.viewSize.width;
//     const idx = Math.floor(Math.random() * partialSketches.length);
//     const partial = partialSketches[idx];

//     try {
//         var loadedPartial = userLayer.importSVG(partial);
//         loadedPartial.set({
//             position: new Point(
//                 userLayer.view.viewSize.width / 2,
//                 userLayer.view.viewSize.width / 2
//             ),
//             opacity: sketchController.opacity,
//             strokeCap: "round",
//             strokeJoin: "round",
//         });
//     } catch (e) {
//         console.error("Partial sketch import is cooked");
//     }

//     loadedPartial.getItems().forEach((item) => {
//         if (item instanceof Group) {
//             item.children.forEach((child) => {
//                 let newElem = userLayer.addChild(child.clone());
//                 sketchController.userPaths.push(newElem);
//             });
//         } else if (item instanceof Shape) {
//             item.remove(); // rectangles are banned
//         } else {
//             if (item instanceof Path) {
//                 let newElem = userLayer.addChild(item.clone());
//                 sketchController.userPaths.push(newElem);
//             }
//         }
//     });
//     loadedPartial.remove();

//     scaleGroup(userLayer, scaleTo);

//     sketchController.svg = paper.project.exportSVG({
//         asString: true,
//     });
//     console.log("LOADED: ", userLayer);
// })();

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

const defaults = new PaperScope();
defaults.activate();
for (let i = 0; i < 4; i++) {
    let newElem = createExemplar(defaults, false);
    // sketchController.sketchScopeIndex += 1; //remove later
    newElem.classList.add("inactive-exemplar");
    document.getElementById("explore-sketches").appendChild(newElem);
}
sketchBook.style.display = "none";