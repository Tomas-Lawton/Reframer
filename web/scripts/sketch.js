class SimpleStack {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.historyHolder = [""];
    }
}

class SketchHandler {
    // Maintains a logical state for sending over WS
    constructor() {
        this.drawState = null;

        // Sketching Data
        this.prompt = null;
        this.svg = paper.project.exportSVG({
            asString: true,
        }); //for svg parsing
        this.frameSize = canvas.getBoundingClientRect().width;

        // Defaults
        this.strokeColor = "rgb(24,24,24)";
        this.strokeWidth = 8;
        this.opacity = 1;
        this.penMode = "pen";
        this.clipDrawing = false;
        this.maximumTraces = 1; // todo change
        this.step = 0;
        this.lastRollingLoss = 0;
        this.linesDisabled = false;
        this.activeStates = [
            "drawing",
            "generating",
            "refining",
            "redrawing",
            "continuing",
        ];
        this.lastHistoryIndex = 0;
        this.penDropMode = "pen";
        this.sketchScopeIndex = 0;
        this.randomRange = 4;
        // TODO Refactor
        this.buttonControlLeft = true;
        this.doneSketching = null;
        this.numAddedPaths = 0;

        // User Initialised
        this.drawRegion = null;
        this.selectionBox = null;
        this.lastRender = null;
        this.lastPrompt = null;
        this.isFirstIteration = null;
        this.lastRollingLoss = null;
        this.traces = null;
        this.boundingBox = null;
        this.transformGroup = null;
        this.useFixation = 2;
        this.showAllLines = false;

        // Settings panel
        this.useAdvanced = false;
        this.initRandomCurves = true;
        this.numRandomCurves = 32;
        this.showAICurves = 3;
        this.numTraces = 1;
        this.pathsOnCanvas = 0;

        // Undo/redo stack
        this.stack = new SimpleStack();
    }
    updateDrawer({
        status,
        svg,
        hasRegion,
        frameSize,
        prompt,
        lines,
        sketchScopeIndex,
        fixation,
    }) {
        this.isFirstIteration = true; //reset canvas
        const canvasBounds = canvas.getBoundingClientRect(); //avoid canvas width glitches
        this.lastPrompt = prompt;

        const res = {
            status: status,
            data: {
                prompt: prompt,
                svg: svg,
                random_curves: lines,
                frame_size: frameSize,
                fixation: fixation,
                region: {
                    activate: hasRegion,
                    x1: sketchController.drawRegion ? sketchController.drawRegion.x : 0,
                    y1: sketchController.drawRegion ?
                        canvasBounds.height - sketchController.drawRegion.y :
                        0,
                    x2: sketchController.drawRegion ?
                        sketchController.drawRegion.x + sketchController.drawRegion.width :
                        canvasBounds.width,
                    y2: sketchController.drawRegion ?
                        canvasBounds.height -
                        sketchController.drawRegion.y -
                        sketchController.drawRegion.height // use non-web y coords
                        :
                        canvasBounds.height, // same as width
                },
                sketch_index: sketchScopeIndex,
            },
        };
        ws.send(JSON.stringify(res));
        console.log(res);
    }
    draw(withRegion = false, svg = null, disableLines = false) {
            this.pathsOnCanvas = userLayer.getItems().length;

            if (noPrompt()) {
                openModal({
                    title: "Type a prompt first!",
                    message: "You need a target for AI sketching.",
                });
                return;
            }
            sketchController.linesDisabled = disableLines;
            this.updateDrawer({
                status: "draw",
                svg: svg || this.svg,
                hasRegion: withRegion,
                frameSize: this.frameSize,
                prompt: this.prompt,
                lines: disableLines ?
                    0 :
                    this.initRandomCurves ?
                    this.numRandomCurves :
                    0,
                fixation: this.useFixation,
            });
            this.step = 0;
            this.clipDrawing = true;
            setActionUI(disableLines ? "refining" : "drawing");
        }
        // generate() {
        //     if (!exemplarSize) {
        //         console.error("exemplars not found");
        //     }
        //     if (noPrompt()) {
        //         openModal({
        //             title: "Type a prompt first!",
        //             message: "You need a target for AI exemplars.",
        //         });
        //         return;
        //     }
        //     this.updateDrawer({
        //         status: "sketch_exemplars",
        //         svg: this.svg,
        //         hasRegion: false,
        //         frameSize: exemplarSize,
        //         prompt: this.prompt,
        //         lines: this.initRandomCurves ? this.numRandomCurves : 0,
        //     });
        //     this.clipDrawing = true;
        //     setActionUI("generating");
        // }
    drawExemplar(sketchCountIndex) {
        if (!exemplarSize) {
            console.error("exemplars not found");
        }
        this.updateDrawer({
            status: "add_new_exemplar",
            svg: this.svg,
            hasRegion: false,
            frameSize: exemplarSize,
            prompt: this.prompt,
            lines: this.numRandomCurves,
            sketchScopeIndex: sketchCountIndex,
            fixation: this.useFixation,
        });
        this.clipDrawing = true;
        // setActionUI("drawing");
    }
    redraw() {
            this.updateDrawer({
                status: "redraw",
            });
            this.step = 0;
            this.clipDrawing = true;
            setActionUI("redrawing");
        }
        // continue () {
        //     // need to change this so it supports updating the prompt or using a new svg
        //     this.updateDrawer({
        //         status: "continue",
        //         prompt: this.prompt,
        //         frameSize: this.frameSize, //can remove?
        //     });
        //     this.clipDrawing = true;
        //     console.log("continuing with potential updated prompt");
        //     setActionUI("continuing");
        // }
    continueSketch() {
        this.clipDrawing = true;
        try {
            this.updateDrawer({
                status: "continue_sketch",
                svg: this.svg,
                frameSize: this.frameSize, //can remove?
                fixation: this.useFixation,
            });
        } catch (e) {
            console.log("Problem with update");
        }
        setActionUI("continuing");
    }
    stopSingle(i) {
        this.updateDrawer({
            status: "stop_single_sketch",
            sketchScopeIndex: i,
        });
        this.clipDrawing = false;
        setActionUI("stop");
    }
    stop() {
        if (this.drawState === "active") {
            timeKeeper.style.visibility = "visible";
        }

        this.updateDrawer({ status: "stop" });
        this.clipDrawing = false;
        setActionUI("stop");
    }
    pause() {
        this.updateDrawer({ status: "stop" });
        this.clipDrawing = false;
        setActionUI("stop");
    }
    resetHistory() {
        sketchController.step = 0; // reset since not continuing
        sketchController.stack.historyHolder = [{ svg: "" }];
        timeKeeper.style.width = "0";
        timeKeeper.setAttribute("max", "0");
        timeKeeper.value = "0";
    }
}

sketchController = new SketchHandler();