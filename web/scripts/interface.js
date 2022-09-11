// Drawing Controls
document.querySelectorAll(".pen-mode").forEach((elem) => {
    elem.addEventListener("click", () => {
        setPenMode(elem.id, elem);
    });
});
document.querySelectorAll(".swatch").forEach((elem) => {
    elem.addEventListener("click", () => {
        let col = window.getComputedStyle(elem).backgroundColor;
        alphaSlider.value = 1;
        controller.strokeColor = col;
        getSelectedPaths().forEach((path) => (path.strokeColor = col));
        picker.setColor(col);
        setPenMode("pen", pen);
    });
});

document.querySelector(".tool-color").addEventListener("click", () => {
    showHide(document.getElementById("picker-ui"));
});

document.getElementById("delete").addEventListener("click", () =>
    openModal({
        title: "Clearing Canvas",
        message: "Are you sure you want to delete your drawing?",
        confirmAction: () => {
            ungroup();
            // Save before clearing
            mainSketch.svg = paper.project.exportSVG({
                asString: true,
            });
            logger.event("clear-sketch");
            mainSketch.sketchLayer.clear();
            modal.style.display = "none";

            if (controller.clipDrawing || controller.drawState === "pause") {
                killExploratorySketches();
                controller.stop();
                controller.resetMetaControls();
                controller.clipDrawing = false;
            }

            emptyExplorer();
            document.getElementById("explore-margin").display = "none";
            // document.getElementById("add-refine").style.display = "none";

            controller.lastPrompt = null;
            updateSelectUI();
        },
    })
);

deleteHandler.addEventListener("click", (e) => {
    deleteItems();
});

copyHandler.addEventListener("click", (e) => {
    if (controller.boundingBox) {
        controller.boundingBox.remove();
        controller.boundingBox = null;
    }
    let copy = controller.transformGroup.clone();
    let inserted = mainSketch.sketchLayer.insertChildren(
        copy.index,
        copy.removeChildren()
    );
    copy.remove();
    controller.transformGroup.selected = false; //deselect og

    ungroup();
    // inserted.forEach((pathCopy) => (pathCopy.data.fixed = true)); //save to user paths
    createGroup(inserted);
    fitToSelection(getSelectedPaths(), "moving");
    updateSelectUI();

    mainSketch.svg = paper.project.exportSVG({
        asString: true,
    });
});

fixedHandler.addEventListener("click", (e) => {
    // let i = fixedHandler.querySelector("i");
    // i.classList.toggle("fa-hand");
    // i.classList.toggle("fa-lock");
    isFixedGroup() ? fixGroup(false) : fixGroup(true);
    updateFixedUI();
});

// document.getElementById("begin").addEventListener("click", () => {
//     if (logger.userName !== "" && logger.userName !== undefined) {
//         document.getElementById("sliding-overlay").style.bottom = "100%";
//         logger.event("begin-pilot");
//     }
// });

undoButton.addEventListener("click", () => {
    sketchHistory.undo();
});

redoButton.addEventListener("click", () => {
    sketchHistory.redo();
});

document.getElementById("save").addEventListener("click", () => {
    download();
});

rotateSlider.oninput = function() {
    transformGroup(controller.transformGroup, "rotation", this.value);
};

scaleSlider.oninput = function() {
    transformGroup(controller.transformGroup, "scaling", this.value / 5);
};

rotateNumber.oninput = function() {
    transformGroup(controller.transformGroup, "rotation", this.value);
};

scaleNumber.oninput = function() {
    transformGroup(controller.transformGroup, "scaling", this.value / 5);
};

alphaSlider.oninput = function() {
    let rgba = getRGBA(this.value);
    controller.alpha = this.value;
    controller.strokeColor = rgba;
    setThisColor(rgba);
    setPenMode("pen", pen);
};

document.getElementById("width-slider").oninput = function() {
    setPointSize(this.value);
    setPenMode("pen", pen);
};

// tidy
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

document.getElementById("close-explorer").addEventListener("click", (e) => {
    emptyExplorer();
    showHide(document.getElementById("explore-margin"));
});

document.getElementById("empty").addEventListener("click", (e) => {
    emptyExplorer();
});

eyeDropper.addEventListener("click", (e) => {
    if (controller.penMode !== "dropper") {
        setPenMode("dropper", eyeDropper);
        eyeDropper.classList.add("selected-mode");
        eyeDropper.classList.remove("simple-hover");
        eyeDropper.style.color = "#ffffff";
    } else {
        setPenMode("pen", pen);
        eyeDropper.classList.remove("selected-mode");
        eyeDropper.classList.add("simple-hover");
        eyeDropper.style.color = "#363636;";
    }
});

penTool.addEventListener("click", (e) => setPenMode("pen"));
eraseTool.addEventListener("click", (e) => setPenMode("erase"));
selectTool.addEventListener("click", (e) => setPenMode("select"));

document.getElementById("settings").addEventListener("click", () => {
    showHide(dropdown);
    // openModal({
    //     title: "Advanced",
    //     message: "Change the drawing behaviour and UI.",
    //     ui: document.getElementById("settings-ui"),
    // });
});

timeKeeper.oninput = function() {
    mainSketch.sketchLayer.clear();
    let stored = sketchHistory.historyHolder[this.value];
    mainSketch.load(
        1,
        stored.svg,
        false // don't reapply opacity
    );
};

palette.addEventListener("click", () => {
    showHide(controlPanel);
    palette.classList.toggle("panel-closed");
});

prompt.addEventListener("input", (e) => {
    // controller.prompt = e.target.value.toLowerCase();
    controller.prompt = e.target.value;
    if (controller.prompt === "") {
        aiMessage.innerHTML = ` What are we drawing?`;
        controllerUI.forEach((elem) => elem.classList.add("inactive-section"));
    } else {
        aiMessage.innerHTML = `Ok, ${controller.prompt}.`;
        controllerUI.forEach((elem) => elem.classList.remove("inactive-section"));
    }
});

prompt.addEventListener("blur", () => {
    mainSketch.svg = paper.project.exportSVG({
        asString: true,
    });
    logger.event("set-prompt");
});

// document.getElementById("user-name").addEventListener("input", (e) => {
//     logger.userName = e.target.value;
// });

document.getElementById("draw").addEventListener("click", () => {
    if (socket) {
        controller.draw();
        mainSketch.svg = paper.project.exportSVG({
            asString: true,
        });
        logger.event("start-drawing");
    }
});

document.getElementById("explore").addEventListener("click", () => {
    if (socket) {
        if (noPrompt()) {
            openModal({
                title: "Type a prompt first!",
                message: "You need a target for AI sketchs.",
                confirmAction: () => (controlPanel.style.display = "flex"),
            });
            return;
        } else {
            // TO DO: Clean up old scopes (now unused) // controller.exploreScopes
            // const total = controller.sketchScopeIndex + Math.floor(Math.random() * 5);
            sketchHistory.historyHolder.push({
                svg: mainSketch.svg,
            });

            total = 4;
            for (let i = 0; i < 4; i++) {
                explorer.removeChild(explorer.firstChild);
            }

            for (let i = 0; i < 4; i++) {
                let sketch = new Sketch(
                    controller.sketchScopeIndex,
                    sketchScope,
                    sketchSize,
                    "AI"
                );
                let newElem = sketch.renderMini();
                controller.exploreScopes.push(controller.sketchScopeIndex);
                explorer.appendChild(newElem);
                controller.newExploreSketch(controller.sketchScopeIndex);
                controller.sketchScopeIndex += 1;
                // }
            }
            controller.clipDrawing = true;
            setActionUI("explore");
            mainSketch.svg = paper.project.exportSVG({
                asString: true,
            });
            logger.event("start-exploring");
        }
    }
});

stopButton.addEventListener("click", () => {
    console.log(controller.drawState);
    stopDrawer();
});

sendToBack.addEventListener("click", () => {
    controller.transformGroup.sendToBack();
    controller.boundingBox.sendToBack();
});

moveUp.addEventListener("click", () => {
    let thisItem = controller.transformGroup;
    mainSketch.sketchLayer.insertChild(thisItem.index + 1, thisItem);
    // thisItem.insertAbove(thisItem);
    controller.boundingBox.insertBelow(thisItem);
});

// document.getElementById("prune").addEventListener("click", () => {
//     console.log(controller.drawState);
//     if (socket) {
//         if (
//             controller.drawState === "stop" ||
//             controller.drawState === "stop-prune" ||
//             controller.drawState === "stopSingle"
//         ) {
//             // after  draw
//             controller.prune();
//         }
//         mainSketch.svg = paper.project.exportSVG({
//             asString: true,
//         });
//         logger.event("prune-sketch");
//     }
// });

focusButton.addEventListener("click", () => {
    mainSketch.frameLayer.activate();
    setPenMode("local", null);
    showHide(localPrompts);
    styles.classList.toggle("hidden");
    backDrop.classList.toggle("greeeeeen");
    accordionItem.classList.toggle("inactive-section");

    let isFrameMode = localPrompts.style.display === "flex";

    if (isFrameMode) {
        setActionUI("focus");
        // function to select specific prompt i in list
        // FOCUS the list item also
        if (mainSketch.localFrames[0]) {
            mainSketch.localFrames[0].frame.querySelector("input").focus();
        }
    } else {
        setActionUI("stop");
        setPenMode("pen", pen);
    }

    for (const item in mainSketch.localFrames) {
        let frame = mainSketch.localFrames[item];
        showHide(frame.frame);
        if (isFrameMode) {
            frame.paperFrame.set(frameOptions);
        } else {
            frame.paperFrame.set({
                fillColor: "rgba(226,226,226,0)",
                strokeColor: "rgba(217, 217, 217, 0.8)",
            });
        }
    }
});

// add back after the study.
// document.getElementById("random-prompt").addEventListener("click", () => {
//     let randomPrompt =
//         promptList[Math.floor(Math.random() * promptList.length)].toLowerCase();
//     prompt.value = randomPrompt;
//     controller.prompt = randomPrompt;
//     aiMessage.innerHTML = `Ok, ${randomPrompt}.`;
//     document
//         .querySelectorAll(".inactive-section")
//         .forEach((elem) => elem.classList.remove("inactive-section"));
// });

// Control panel
controlPanel.onmousedown = (e) => {
    if (window.innerWidth > 700) {
        let bounds = document.getElementById("ai-content").getBoundingClientRect();
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

styles.onmousedown = (e) => {
    e = e || window.event;
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = (e) => elementDrag(e, styles);
};

// sketchBook.onmousedown = (e) => {
//     if (window.innerWidth > 700) {
//         let content = document.getElementById("static-sketches");
//         let bounds = content.getBoundingClientRect();
//         e = e || window.event;
//         pos3 = e.clientX;
//         pos4 = e.clientY;
//         if (
//             pos3 < bounds.left ||
//             pos3 > bounds.right ||
//             pos4 < bounds.top ||
//             pos4 > bounds.bottom
//         ) {
//             document.onmouseup = closeDragElement;
//             document.onmousemove = (e) => elementDrag(e, sketchBook);
//             console.log("dragging");
//         }
//     }
// };

localPrompts.onmousedown = (e) => {
    if (window.innerWidth > 700) {
        e = e || window.event;
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = (e) => elementDrag(e, localPrompts);
        console.log("dragging");
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
            // document.onmousemove = (e) => elementDrag(e, sketchBook);
            document.onmousemove = (e) =>
                elementDrag(e, document.getElementById("explore-margin"));
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

document.getElementById("num-squiggles").oninput = function() {
    controller.maxCurves = parseInt(this.value);
    setLineLabels(mainSketch.sketchLayer);
};

const respectSlider = document.getElementById("respect-slider");
let lastLearningRate = controller.learningRate;

respectSlider.oninput = function() {
    controller.learningRate = parseInt(this.value);
    let msg = controller.learningRate > 2 ? "More" : "Less";
    document.getElementById("fix-label").innerHTML = msg;
};

respectSlider.onmousedown = () => {
    pauseActiveDrawer();
    lastLearningRate = controller.learningRate;
};

respectSlider.onmouseup = () => {
    if (controller.liveCollab) {
        if (controller.learningRate !== lastLearningRate) {
            controller.continueSketch();
        }
        controller.liveCollab = false;
    }
};

header.addEventListener("click", () => {
    accordionItem.classList.toggle("open");
    accordionItem.classList.toggle("closed");
    if (accordionItem.classList.contains("open")) {
        body.style.maxHeight = body.scrollHeight + "px";
    } else {
        body.style.maxHeight = "0px";
    }
});

toolWindow.addEventListener("click", () => {
    document
        .querySelectorAll(".expanded")
        .forEach((item) => (item.style.display = "inherit"));
    toolWindow.style.display = "none";
    toolToggle.firstChild.classList.add("fa-minus");
    toolToggle.firstChild.classList.remove("fa-plus");
    // currentTool.classList.remove("active-tool");
    styles.style.maxWidth = "300px";
    toolToggle.style.display = "flex";

    // currentTool.style.top = "100px";
    styles.style.left = window.innerWidth - 10 - styles.offsetWidth + "px";
    styles.style.top = window.innerHeight / 2 + "px";
});

toolToggle.addEventListener("click", () => {
    let currentTool = document.querySelector(".animation-window");
    // currentTool.style.height = "230px";
    // currentTool.classList.toggle("current-tool");

    document
        .querySelectorAll(".expanded")
        .forEach((item) => (item.style.display = "none"));
    toolWindow.style.display = "flex";
    toolToggle.firstChild.classList.add("fa-plus");
    toolToggle.firstChild.classList.remove("fa-minus");
    styles.style.maxWidth = "120px";
    toolToggle.style.display = "none";
    // currentTool.classList.add("active-tool");
    // styles.style.top = window.innerHeight - 10 - styles.offsetHeight / 2 + "px";
});
// Shortcuts
window.addEventListener("keydown", function(event) {
    if (event.metaKey && event.shiftKey) {
        if (event.code === "KeyP") {
            setPenMode("pen", pen);
        }
        if (event.code === "KeyS") {
            setPenMode("select", document.getElementById("select"));
        }
        if (event.code === "KeyE") {
            setPenMode("erase", document.getElementById("erase"));
        }
        if (event.code === "KeyU") {
            sketchHistory.undo();
        }
        if (event.code === "KeyR") {
            sketchHistory.redo();
        }
    }

    if (event.key == "Escape") {
        // close the frame mode
        stopDrawer();
    }

    if (document.activeElement !== prompt) {
        if (event.key == "Delete" || event.key == "Backspace") {
            deleteItems();
        }
    } else {
        if (event.key == "Enter") {
            if (socket) {
                controller.draw();
                mainSketch.svg = paper.project.exportSVG({
                    asString: true,
                });
                logger.event("start-drawing");
            }
        }
    }
});

// document.getElementById("scrapbook").addEventListener("click", () => {
//     showHide(sketchBook);
//     document.getElementById("scrapbook").classList.toggle("panel-closed");
// });

// document.querySelectorAll(".card-icon-background").forEach((elem) => {
//     elem.addEventListener("click", () => {
//         elem.parentElement.parentElement.remove();
//     });
// });

// document.getElementById("save-sketch").addEventListener("click", () => {
//     ungroup();
//     mainSketch.sketchLayer.getItems().forEach((path) => {
//         path.selected = false;
//     });

//     mainSketch.saveStatic(
//         mainSketch.extractScaledSVG(1 / scaleRatio) //adds as backup
//     );
//     mainSketch.svg = paper.project.exportSVG({
//         asString: true,
//     });
//     logger.event("saved-in-sketchbook");
// });

// document.getElementById("show-all-paths").addEventListener("click", () => {
//     controller.showAllLines = !controller.showAllLines;
//     document.getElementById("show-all-paths").classList.toggle("inactive-pill");
// });

// document.getElementById("num-traces").oninput = function() {
//     controller.numTraces = parseInt(this.value);
// };

// document.getElementById("overwrite").addEventListener("click", () => {
//     if (controller.allowOverwrite) {
//         document.getElementById("overwrite").innerHTML = "Copy";
//     } else {
//         document.getElementById("overwrite").innerHTML = "Overwrite";
//     }
//     document.getElementById("overwrite").classList.toggle("inactive-pill");
//     controller.allowOverwrite = !controller.allowOverwrite;
// });

// function dragover(e) {
//     e.preventDefault();
// }

// function dragentercanvas(e) {
//     e.preventDefault();
//     canvas.classList.add("drop-ready");
// }

// function dropCanvas(e) {
//     canvas.classList.remove("drop-ready");
//     let i = e.dataTransfer.getData("text/plain");
//     // to do switch around mainsketch imports?
//     controller.sketches[i].importTo(mainSketch);
// }

// function dragleavecanvas(e) {
//     e.preventDefault();
//     canvas.classList.remove("drop-ready");
// }

// sketchContainer.addEventListener("dragover", dragover);
// sketchContainer.addEventListener("dragenter", dragentercanvas);
// sketchContainer.addEventListener("dragleave", dragleavecanvas);
// sketchContainer.addEventListener("drop", dropCanvas);

// function dragoverhover(e) {
//     e.preventDefault();
//     sketchGrid.classList.add("drop-ready");
//     sketchGrid.classList.remove("basic-background");
// }

// function dragleavesketch(e) {
//     e.preventDefault();
//     sketchGrid.classList.remove("drop-ready");
//     sketchGrid.classList.add("basic-background");
// }

// function dropSketch(e) {
//     // AI to Static
//     sketchGrid.classList.remove("drop-ready");
//     const sketchCountIndex = e.dataTransfer.getData("text/plain");
//     if (document.querySelector(`#AI-sketch-item-${sketchCountIndex}`)) {
//         let importing = controller.sketches[sketchCountIndex];
//         importing.saveStatic(importing.extractSVG());
//     }
// }

// sketchGrid.addEventListener("dragover", dragoverhover);
// sketchGrid.addEventListener("dragleave", dragleavesketch);
// sketchGrid.addEventListener("drop", dropSketch);

// sketchBook.style.left =
//     window.innerWidth - sketchBook.getBoundingClientRect().width - 5 + "px";

console.info("Page loaded");