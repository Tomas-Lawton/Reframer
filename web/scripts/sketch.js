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
        this.drawState;

        // Sketching Data
        this.prompt = null;
        this.svg = paper.project.exportSVG({
            asString: true,
        }); //for svg parsing
        this.frameSize = canvas.getBoundingClientRect().width;
        this.scopeRef = [];

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
            "brainstorming-exemplars",
            "redrawing",
            "continuing",
        ];
        this.lastHistoryIndex = 0;
        this.penDropMode = "select";
        this.sketchScopeIndex = 0;
        this.addPaths = 4;
        // TODO Refactor
        this.buttonControlLeft = true;
        this.doneSketching = null;

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
        this.useFixation = 3;
        this.showAllLines = true;
        this.targetDrawing = false;
        this.userPaths = [];

        // Settings panel
        this.useAdvanced = false;
        this.initRandomCurves = true;
        this.numAddedCurves = 32;
        this.numTraces = 1;

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
        userPaths,
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
                num_user_paths: userPaths,
                region: {
                    activate: hasRegion,
                    x1: this.drawRegion ? this.drawRegion.x : 0,
                    y1: this.drawRegion ? canvasBounds.height - this.drawRegion.y : 0,
                    x2: this.drawRegion ?
                        this.drawRegion.x + this.drawRegion.width :
                        canvasBounds.width,
                    y2: this.drawRegion ?
                        canvasBounds.height - this.drawRegion.y - this.drawRegion.height // use non-web y coords
                        :
                        canvasBounds.height, // same as width
                },
                sketch_index: sketchScopeIndex,
            },
        };
        console.log(res);
        ws.send(JSON.stringify(res));
    }
    sortPaths() {
        let aiPaths = []; // update after
        userLayer.getItems().forEach((item) => {
            if (!this.userPaths.includes(item)) {
                aiPaths.push(item);
            }
            item.remove();
        });
        let sorted = this.userPaths.concat(aiPaths);
        sorted.forEach((elem) => userLayer.addChild(elem)); //deleting doesn't destroy references
        this.svg = paper.project.exportSVG({
            asString: true,
        }); //for svg parsing

        console.log("Sorted: ", sorted);
        console.log("USER: ", this.userPaths.length);
        console.log("AI: ", aiPaths.length);
        console.log("TOTAL: ", userLayer.getItems().length);
    }

    draw(withRegion = false, svg = null, disableLines = false) {
            if (noPrompt()) {
                openModal({
                    title: "Type a prompt first!",
                    message: "You need a target for AI sketching.",
                });
                return;
            }
            if (!this.clipDrawing) {
                this.clipDrawing = true;
                this.targetDrawing = false;

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
                        this.numAddedCurves :
                        0,
                    fixation: this.useFixation,
                });
                this.step = 0;
                this.clipDrawing = true;
                setActionUI(disableLines ? "refining" : "drawing");
            } else {
                throw new Error("Can't continue if already running");
            }
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
        //         lines: this.initRandomCurves ? this.numAddedCurves : 0,
        //     });
        //     this.clipDrawing = true;
        //     setActionUI("generating");
        // }
    drawExemplar(sketchCountIndex) {
        if (!this.clipDrawing) {
            if (!exemplarSize) {
                console.error("exemplars not found");
            }
            console.log("Starting exemplar: ", sketchCountIndex);
            this.clipDrawing = true;
            this.targetDrawing = true;
            this.updateDrawer({
                status: "add_new_exemplar",
                svg: this.svg,
                hasRegion: false,
                frameSize: exemplarSize,
                prompt: this.prompt,
                lines: this.numAddedCurves,
                sketchScopeIndex: sketchCountIndex,
                fixation: this.useFixation,
            });
            this.clipDrawing = true;
        }
    }
    redraw() {
            // this.targetDrawing = false;

            // Should redraw also draw exploratory sketches?
            if (!this.clipDrawing) {
                this.clipDrawing = true;
                this.updateDrawer({
                    status: "redraw",
                });
                this.step = 0;
                this.clipDrawing = true;
                setActionUI("redrawing");
            } else {
                throw new Error("Can't continue if already running");
            }
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
        // check the drawing mode. if it's brainstorming with add_new_exemplar then each of the drawers should be continued. continue all brainstorms.
        if (!this.clipDrawing) {
            this.clipDrawing = true;

            if (this.targetDrawing) {
                explorer.childNodes.forEach((child, i) => {
                    try {
                        this.updateDrawer({
                            status: "continue_single_sketch",
                            svg: this.svg,
                            frameSize: this.frameSize, //can remove?
                            fixation: this.useFixation,
                            sketchScopeIndex: sketchController.scopeRef[i],
                        });
                    } catch (e) {
                        console.log("Problem with update");
                    }
                });
            } else {
                try {
                    this.sortPaths();
                    this.updateDrawer({
                        status: "continue_sketch",
                        svg: this.svg,
                        frameSize: this.frameSize, //can remove?
                        fixation: this.useFixation,
                        userPaths: this.userPaths.length,
                    });
                } catch (e) {
                    console.log("Problem with update");
                }
            }
            setActionUI("continuing");
        } else {
            throw new Error("Can't continue if already running");
        }
    }
    prune() {
        if (!this.clipDrawing) {
            this.clipDrawing = true;
            this.updateDrawer({
                status: "prune",
            });
            setActionUI("pruning");
        }
    }
    stopSingle(i) {
        this.updateDrawer({
            status: "stop_single_sketch",
            sketchScopeIndex: i,
        });
        this.clipDrawing = false;
        setActionUI("stopSingle");
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
        setActionUI("pause");
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