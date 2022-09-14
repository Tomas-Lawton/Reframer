const actions = document.querySelectorAll(".clip-actions>div");
const [drawButton, focusButton, exploreButton, stopButton] = actions;

const setActionState = (state) => {
    switch (state) {
        case "inactive":
            // Add the state stuff also??
            setModeDefault();
            break;
        case "draw":
            setModeDraw();
            break;
        case "explore":
            setModeExplore();
            break;
        case "frame":
            setModeFrame();
            hint.innerHTML = `Creating prompt frames will give the AI context`;
            break;
        case "active-frame":
            setModeActiveFrame();
            break;
    }
    console.log(`%c Status: ${state}`, `color:green`);
    controller.drawState = state;
};

const setModeDefault = (hideExplorer = true) => {
    drawButton.className = "action-default";
    focusButton.className = "action-default";
    exploreButton.className = "action-default";
    stopButton.className = "action-inactive";
    actions.forEach((button) => button.classList.add("tooltip"));

    document.querySelector(".project").classList.remove("greeeeeen");
    accordionItem.classList.remove("inactive-section");

    if (hideExplorer) hide(explorerPanel);

    canvas.classList.remove("loading-canvas");
    document.getElementById("loading").style.display = "none";
    document.querySelector(".control-lines").style.display = "block";
    undoButton.classList.remove("inactive-action");
    redoButton.classList.remove("inactive-action");
    hint.innerHTML = `Draw with AI by adding a prompt and clicking draw.`;
    sketchHistory.historyHolder.length > 1 &&
        (historyBlock.style.display = "block");
};

const setModeDraw = () => {
    exploreButton.className = "action-inactive";
    drawButton.className = "action-active";
    hint.innerHTML = `Don't wait. Draw with me!`;
    focusButton.className = "action-default";
    stopButton.className = "action-stop";
    actions.forEach((button) => button.classList.add("tooltip"));

    document.querySelector(".project").classList.remove("greeeeeen");
    accordionItem.classList.remove("inactive-section");

    hide(explorerPanel);

    accordionItem.classList.add("open");
    accordionItem.classList.remove("closed");
    undoButton.classList.add("inactive-action");
    redoButton.classList.add("inactive-action");
    document.getElementById("loading").style.display = "flex";
    document.querySelector(".control-lines").style.display = "none";
};

const setModeExplore = () => {
    exploreButton.className = "action-active";
    drawButton.className = "action-inactive";
    focusButton.className = "action-inactive";
    stopButton.className = "action-stop";
    actions.forEach((button) => button.classList.add("tooltip"));

    hint.innerHTML = `View creative possibilities in the explorer`;
    hide(historyBlock);

    show(explorerPanel);

    accordionItem.classList.add("open");
    accordionItem.classList.remove("closed");
    undoButton.classList.add("inactive-action");
    redoButton.classList.add("inactive-action");
    document.getElementById("loading").style.display = "flex";
    document.querySelector(".control-lines").style.display = "none";
};

const setModeFrame = () => {
    console.log("frame");
    drawButton.className = "action-default";
    focusButton.className = "action-focus";
    exploreButton.className = "action-inactive";
    stopButton.className = "action-inactive";
    actions.forEach((button) => button.classList.add("tooltip"));

    document.querySelector(".project").classList.add("greeeeeen");
    accordionItem.classList.add("inactive-section");

    accordionItem.classList.remove("open");
    accordionItem.classList.add("closed");
    hint.innerHTML = `Creating prompt frames will give the AI context`;

    hide(explorerPanel);

    canvasFrame.firstElementChild.innerHTML = `Creating focus frames for: ${controller.prompt}`;
    prompt.focus();
};

const setModeActiveFrame = () => {
    drawButton.className = "action-active";
    focusButton.className = "action-focus";
    exploreButton.className = "action-inactive";
    stopButton.className = "action-stop";
    actions.forEach((button) => button.classList.add("tooltip"));

    document.querySelector(".project").classList.add("greeeeeen");
    accordionItem.classList.add("inactive-section");

    hint.innerHTML = `Creating prompt frames will give the AI context`;

    hide(explorerPanel);

    canvasFrame.firstElementChild.innerHTML = `Creating focus frames for: ${controller.prompt}`;
    prompt.focus();
};

drawButton.addEventListener("click", () => {
    if (socket) {
        if (controller.drawState === "frame") {
            setActionState("active-frame");
        } else {
            setActionState("draw");
        }
        controller.draw();
        mainSketch.svg = paper.project.exportSVG({
            asString: true,
        });
        logger.event("start-drawing");
    }
});

exploreButton.addEventListener("click", () => {
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
            sketchHistory.pushUndo();

            generateExploreSketches();
        }
    }
});

focusButton.addEventListener("click", () => {
    switch (controller.drawState) {
        case "inactive":
            setActionState("frame");

            mainSketch.frameLayer.activate();
            setPenMode("local");
            show(localPrompts);
            hide(styles);

            for (const item in mainSketch.localFrames) {
                let frameItem = mainSketch.localFrames[item];
                frameItem.frame.querySelectorAll("i").forEach((icon) => show(icon));
                show(frameItem.frame.querySelector("div"));
                frameItem.frame
                    .querySelector("input")
                    .classList.remove("frame-label-inactive");
                frameItem.frame
                    .querySelector("input")
                    .classList.add("frame-label-active");
                frameItem.paperFrame.set(frameOptions);
            }
            break;
        case "draw":
            setActionState("active-frame");

            mainSketch.frameLayer.activate();
            setPenMode("local");
            show(localPrompts);
            hide(styles);
            for (const item in mainSketch.localFrames) {
                let frameItem = mainSketch.localFrames[item];
                frameItem.frame.querySelectorAll("i").forEach((icon) => show(icon));
                show(frameItem.frame.querySelector("div"));
                frameItem.frame
                    .querySelector("input")
                    .classList.remove("frame-label-inactive");
                frameItem.frame
                    .querySelector("input")
                    .classList.add("frame-label-active");
                frameItem.paperFrame.set(frameOptions);
            }
            break;

        case "frame":
            setActionState("inactive");

            mainSketch.sketchLayer.activate();
            setPenMode("pen");
            hide(localPrompts);
            show(styles);

            canvasFrame.firstElementChild.innerHTML = `Sketch of ${controller.prompt}`;

            // hide all frames

            for (const item in mainSketch.localFrames) {
                let frameItem = mainSketch.localFrames[item];
                frameItem.frame.querySelectorAll("i").forEach((icon) => hide(icon));
                hide(frameItem.frame.querySelector("div"));
                frameItem.frame
                    .querySelector("input")
                    .classList.remove("frame-label-active");
                frameItem.frame
                    .querySelector("input")
                    .classList.add("frame-label-inactive");
                frameItem.paperFrame.set({
                    fillColor: "rgba(226,226,226,0)",
                    strokeColor: "rgba(217, 217, 217, 0.8)",
                });
            }
            break;
        case "active-frame":
            setActionState("draw");

            mainSketch.sketchLayer.activate();
            setPenMode("pen");
            hide(localPrompts);
            show(styles);

            for (const item in mainSketch.localFrames) {
                let frameItem = mainSketch.localFrames[item];
                frameItem.frame.querySelectorAll("i").forEach((icon) => hide(icon));
                hide(frameItem.frame.querySelector("div"));
                frameItem.frame
                    .querySelector("input")
                    .classList.remove("frame-label-active");
                frameItem.frame
                    .querySelector("input")
                    .classList.add("frame-label-inactive");
                frameItem.paperFrame.set({
                    fillColor: "rgba(226,226,226,0)",
                    strokeColor: "rgba(217, 217, 217, 0.8)",
                });
            }
            break;
    }
});

stopButton.addEventListener("click", () => {
    if (controller.drawState === "active-frame") {
        setActionState("frame");
    } else {
        setActionState("inactive");
    }

    if (controller.drawState === "explore") {
        killExploratorySketches();
        controller.clipDrawing = false;
        logger.event("stop-exploring");
    } else {
        if (controller.drawState === "pause") {
            controller.liveCollab = false;
        }
        controller.stop(); //flag
        controller.clipDrawing = false;
        mainSketch.svg = paper.project.exportSVG({
            asString: true,
        });
        logger.event("stop-drawing");
    }
});