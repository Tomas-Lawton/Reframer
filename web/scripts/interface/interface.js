document.querySelectorAll(".pen-mode").forEach((elem) =>
    elem.addEventListener("click", () => {
        setPenMode(elem.id, elem);
    })
);

document.querySelectorAll(".swatch").forEach((elem) =>
    elem.addEventListener("click", () => {
        let col = window.getComputedStyle(elem).backgroundColor;
        alphaSlider.value = 1;
        controller.strokeColor = col;
        getSelectedPaths().forEach((path) => (path.strokeColor = col));
        picker.setColor(col);
        // setPenMode("pen", pen);
    })
);

toolWindow.addEventListener("click", () => {
    showHide(pickerSelect);
    pickerSelect.style.left =
        styles.getBoundingClientRect().left - pickerSelect.offsetWidth - 2 + "px";
    pickerSelect.style.top = styles.getBoundingClientRect().top + "px";
});

document.getElementById("delete").addEventListener("click", () =>
    openModal({
        title: "Clearing Canvas",
        message: "Are you sure you want to delete your drawing?",
        confirmAction: () => {
            setActionState("inactive");
            ungroup();
            // Save before clearing
            mainSketch.svg = paper.project.exportSVG({
                asString: true,
            });
            logger.event("clear-sketch");
            mainSketch.sketchLayer.clear();
            modal.style.display = "none";
            sketchHistory.clear();

            if (controller.clipDrawing || controller.drawState === "pause") {
                removeExploreSketches();
                controller.stop();
                controller.clipDrawing = false;
            }

            emptyExplorer();

            explorerPanel.display = "none";

            controller.lastPrompt = null;
            updateSelectUI();

            sketchHistory = new SketchHistory(mainSketch);
            Object.keys(mainSketch.localFrames).forEach((i) => deleteFrame(i));
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

document.getElementById("close-explorer").addEventListener("click", (e) => {
    emptyExplorer();
    setActionState("inactive");
    hide(explorerPanel);
});

document.getElementById("empty").addEventListener("click", (e) => {
    emptyExplorer();
    generateExploreSketches();
});

document.getElementById("settings").addEventListener("click", () => {
    dropdown.classList.toggle("hidden-panel")
});

timeKeeper.oninput = (e) => {
    mainSketch.sketchLayer.clear();
    let stored = sketchHistory.historyHolder[e.target.value];
    mainSketch.load(
        1,
        stored.svg,
        false // don't reapply opacity
    );
};

drawer.addEventListener("click", () => {
    let content = document.querySelector(".control-panel .content-margin")
    if (content.style.display !== "none") {
        hide(content)
        controlPanel.style.minWidth = "0px"
        controlPanel.style.width = "auto"

    } else {
        content.style.display = "initial"
        controlPanel.style.minWidth = "230px";
        controlPanel.style.width = "430px"
    }

    showHide(document.querySelector("header>div"));
    showHide(document.querySelector(".control-drawer"));
    drawer.classList.toggle("fa-chevron-left");
    drawer.classList.toggle("fa-chevron-right");
});

prompt.addEventListener("input", (e) => {
    controller.prompt = e.target.value.toLowerCase();
    // controller.prompt = e.target.value;
    frameName.innerHTML = `System will draw "${controller.prompt}."`;

    if (controller.prompt === "") {
        controllerUI.forEach((elem) => elem.classList.add("inactive-section"));
    } else {
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

// add back after the study.
// document.getElementById("random-prompt").addEventListener("click", () => {
//     let randomPrompt =
//         promptList[Math.floor(Math.random() * promptList.length)].toLowerCase();
//     prompt.value = randomPrompt;
//     controller.prompt = randomPrompt;
//     document
//         .querySelectorAll(".inactive-section")
//         .forEach((elem) => elem.classList.remove("inactive-section"));
// });

// Controlpanel drawer drag

controlDrawer.onmousedown = (e) => {
    pos3 = e.clientX;
    document.onmouseup = closeDragElement;
    document.onmousemove = (e) => setDrawerSize(e);
};

document.getElementById("stroke-dot").onmousedown = (e) => {
    e = e || window.event;
    pos3 = e.clientX;
    pos4 = e.clientY;
    console.log("moving hairs");
    document.onmouseup = closeDragElement;
    document.onmousemove = (e) => shiftPen(e);
};


document.querySelector(".drawing-tool-panel :first-child").onmousedown = (e) => {
    e = e || window.event;
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = (e) => elementDrag(e, [pickerSelect, styles]);
};

frameName.onmousedown = (e) => {
    e = e || window.event;
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = (e) => elementDrag(e, sketchContainer);
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

explorerPanel.onmousedown = (e) => {
    let bounds = explorerPanel.firstElementChild.getBoundingClientRect();
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
        document.onmousemove = (e) => elementDrag(e, explorerPanel);
    }
};

const elementDrag = (e, arr) => {
    e = e || window.event;
    // e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;

    if (Array.isArray(arr)) {
        arr.forEach((item) => {
            item.style.top = item.offsetTop - pos2 + "px";
            item.style.left = item.offsetLeft - pos1 + "px";
        });
    } else {
        let item = arr;
        item.style.top = item.offsetTop - pos2 + "px";
        item.style.left = item.offsetLeft - pos1 + "px";
    }
};

function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
}

const shiftPen = (e) => {
    e = e || window.event;
    let item = document.getElementById("stroke-dot");
    let bounds = item.getBoundingClientRect();
    var centerX = bounds.left + item.offsetWidth / 2;
    var centerY = bounds.top + item.offsetHeight / 2;

    let distX = Math.min(Math.abs(centerX - e.clientX) * 2, 131);
    let distY = Math.min(Math.abs(centerY - e.clientY) * 2, 131);
    let newAlpha = scaleRange(distX, 0, 131, 1, 0);

    setPointSize(distY);
    setAlpha(newAlpha);
};

const setDrawerSize = (e) => {
    e = e || window.event;
    let controlPadding = window.getComputedStyle(controlPanel).paddingLeft;
    controlPadding = parseInt(controlPadding);
    pos3 = e.clientX - controlPadding * 2;
    controlPanel.style.width = pos3 + "px";

    // spark.activate(); //return to main
    // setup();
    // mainScope.activate(); //return to main
    // sparkCanvas.style.width =
    //     document.querySelector(".panel-section").clientWidth + "px";
    // sparkCanvas.style.height = 150 + "px";
};

document.querySelectorAll(".tab-item").forEach((tab) => {
    tab.addEventListener("click", () => {
        if (!tab.classList.contains("active-tab")) {
            document
                .querySelectorAll(".tab-item")
                .forEach((tabItem) => tabItem.classList.toggle("active-tab"));

            if (tab.id == "style-tab") {
                document.getElementById("style-content").parentElement.style.display =
                    "block";
                controlPanel.style.display = "none";
            } else {
                document.getElementById("style-content").parentElement.style.display =
                    "none";
                controlPanel.style.display = "block";
            }
        }
    });
});

document.getElementById("num-squiggles").oninput = (e) => {
    controller.maxCurves = parseInt(e.target.value);
    setLineLabels(mainSketch.sketchLayer);
};

frameDropIn.forEach((button) =>
    button.addEventListener("click", () => focusLogic())
);

document
    .querySelector(".local-prompts>button")
    .addEventListener("click", () => {
        let w = parseInt(150 * Math.random() + 100);
        let h = parseInt(150 * Math.random() + 100);
        let x = parseInt((canvas.width * 0.4 - w) * Math.random() + w / 2);
        let y = parseInt((canvas.width * 0.4 - h) * Math.random() + h / 2);
        let b = new Rectangle({
            x,
            y,
            width: w,
            height: h,
        });
        createLocalPrompt(b, x, y, w, h);
    });

let lastLearningRate = controller.learningRate;
respectSlider.oninput = (e) => {
    controller.learningRate = e.target.value / 100;
    let msg = controller.learningRate > 0.2 ? "More" : "Less";
    document.getElementById("fix-label").innerHTML = msg;
};

respectSlider.onmousedown = () => {
    controller.pause();
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

socketLight.addEventListener("click", () => {
    if (!socket) connect();
});

toolToggle.addEventListener("click", () => {
    // let currentTool = document.querySelector(".animation-window");
    // currentTool.style.height = "230px";
    // currentTool.classList.toggle("current-tool");
    pickerSelect.style.left =
        styles.getBoundingClientRect().left - pickerSelect.offsetWidth - 2 + "px";
    pickerSelect.style.top = styles.getBoundingClientRect().top + "px";

    if (toolToggle.firstChild.classList.contains("fa-minus")) {
        document
            .querySelectorAll(".expanded")
            .forEach((item) => (item.style.display = "none"));
        toolWindow.style.display = "flex";
        toolToggle.firstChild.classList.add("fa-plus");
        toolToggle.firstChild.classList.remove("fa-minus");
        styles.style.maxWidth = "120px";
        // currentTool.classList.add("active-tool");
        // styles.style.top = window.innerHeight - 10 - styles.offsetHeight / 2 + "px";
    } else {
        document
            .querySelectorAll(".expanded")
            .forEach((item) => (item.style.display = "inherit"));
        toolToggle.firstChild.classList.add("fa-minus");
        toolToggle.firstChild.classList.remove("fa-plus");
        // currentTool.classList.remove("active-tool");
        styles.style.maxWidth = "300px";

        // currentTool.style.top = "100px";
        styles.style.left = window.innerWidth - 10 - styles.offsetWidth + "px";
        styles.style.top = window.innerHeight / 2 + "px";
    }
});

document.querySelector(".switch-mode").addEventListener("click", () => {
    focusLogic();
});

// Shortcuts
window.addEventListener("keydown", (event) => {
    if (event.code === "Escape") {
        stopLogic();
    }
    if (event.ctrlKey && event.shiftKey && event.code === "KeyZ") {
        sketchHistory.redo();
    } else if (event.ctrlKey && event.code === "KeyZ") {
        sketchHistory.undo();
    } else if (event.shiftKey) {
        if (event.code === "KeyP") {
            setPenMode("pen", pen);
        }
        if (event.code === "KeyS") {
            setPenMode("select");
        }
        if (event.code === "KeyE") {
            setPenMode("erase");
        }
    }

    if (document.activeElement !== prompt) {
        if (event.key == "Delete" || event.key == "Backspace" && controller.transformGroup) {
            deleteItems();
        }
    }
    if (document.activeElement === prompt) {
        if (event.key == "Enter") {
            drawLogic();
            prompt.blur();
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

// document.getElementById("num-traces").oninput = (e) =>{
//     controller.numTraces = parseInt(e.target.value);
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
    // to do switch around mainsketch imports?
    controller.sketches[i].importTo(mainSketch);
}

function dragleavecanvas(e) {
    e.preventDefault();
    canvas.classList.remove("drop-ready");
}

sketchContainer.addEventListener("dragover", dragover);
sketchContainer.addEventListener("dragenter", dragentercanvas);
sketchContainer.addEventListener("dragleave", dragleavecanvas);
sketchContainer.addEventListener("drop", dropCanvas);

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