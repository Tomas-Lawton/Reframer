const actions = document.querySelectorAll(".clip-actions>div");
const [exploreButton, stopButton] = actions;
stopButton.addEventListener("click", () => stopLogic());
exploreButton.addEventListener("click", () => exploreLogic());

const setActionState = (state) => {
    switch (state) {
        case "inactive":
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

const setModeDefault = () => {
    exploreButton.className = "action-default";
    stopButton.className = "action-inactive";
    actions.forEach((button) => button.classList.add("tooltip"));

    prompt.classList.remove("inactive-prompt");
    document.querySelector(".project").classList.remove("greeeeeen");


    canvas.classList.remove("loading-canvas");
    document.getElementById("loading").style.display = "none";
    // document.querySelector(".control-lines").style.display = "block";
    undoButton.classList.remove("inactive-section");
    redoButton.classList.remove("inactive-section");
    hint.innerHTML = `Draw with AI by adding a prompt and clicking draw.`;
    if (sketchHistory.historyHolder.length > 2) {
        show(historyBlock);
        body.style.maxHeight = body.scrollHeight + "px";
    } // 2 because stop also has event

    document.querySelector(".current-status").style.color = "#A0A0A0";
    document.querySelector(".current-status").innerHTML = "Inactive";
};


const setModeExplore = () => {
    exploreButton.className = "action-current";
    stopButton.className = "action-stop";
    actions.forEach((button) => button.classList.add("tooltip"));

    prompt.classList.add("inactive-prompt")
    hint.innerHTML = `View creative possibilities in the explorer`;
    hide(historyBlock);
    // show(explorerPanel);

    accordionItem.classList.add("open");
    accordionItem.classList.remove("closed");
    undoButton.classList.add("inactive-section");
    redoButton.classList.add("inactive-section");
    document.getElementById("loading").style.display = "flex";
    // document.querySelector(".control-lines").style.display = "none";

    document.querySelector(".current-status").style.color = "#7b66ff";
    document.querySelector(".current-status").innerHTML = "Exploring";
};

const activateCanvasFrames = () => {
    for (const item in mainSketch.localFrames) {
        let frameItem = mainSketch.localFrames[item];
        frameItem.frame.querySelectorAll("i").forEach((icon) => show(icon));
        show(frameItem.frame.querySelector("div"));
        frameItem.frame
            .querySelector("input")
            .classList.remove("frame-label-inactive");
        frameItem.frame.querySelector("input").classList.add("frame-label-active");
        frameItem.paperFrame.set(frameOptions);
    }
};

const deactivateCanvasFrames = () => {
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
            strokeColor: "rgba(180, 180, 180, 0.8)",
        });
    }
};

const exploreLogic = () => {
    if (noPrompt()) {
        openModal({
            title: "What are we drawing?",
            message: "Without a prompt, the AI doesn't know what to draw!",
        });
        return;
    }

    if (noPrompt()) {
        openModal({
            title: "Type a prompt first!",
            message: "You need a target for AI sketchs.",
            confirmAction: () => (controlPanel.style.display = "flex"),
        });
        return;
    } else {
        sketchHistory.historyHolder.push({
            svg: mainSketch.svg,
            loss: mainSketch.semanticLoss,
        });
        sketchHistory.pushUndo();
        generateExploreSketches();
    }

};

const stopLogic = () => {
    if (controller.drawState === "active-frame") {
        setActionState("frame");
        controller.stop(); //flag   
        controller.clipDrawing = false;

        // mainSketch.sketchLayer.activate();
        // setPenMode("pen");
        // hide(localPrompts);
        // show(styles);
        // deactivateCanvasFrames();

        logger.event("stop-drawing");
    } else if (controller.drawState === "explore") {
        removeExploreSketches();
        controller.clipDrawing = false;
        setActionState("inactive");
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
        setActionState("inactive");

        // mainSketch.sketchLayer.activate();
        // setPenMode("pen");
        // hide(localPrompts);
        // show(styles);
        // deactivateCanvasFrames();

        logger.event("stop-drawing");
    }
};