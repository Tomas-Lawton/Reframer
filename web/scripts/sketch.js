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
            "explore",
            "redrawing",
            "continuing",
        ];
        this.lastHistoryIndex = 0;
        this.penDropMode = "select";
        this.sketchScopeIndex = 0;
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
        this.maxCurves = 32;
        this.addLines = 0;
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
        this.lastPrompt = prompt;
        const canvasBounds = canvas.getBoundingClientRect(); //avoid canvas width glitches

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
        let sorted = [...this.userPaths];
        userLayer.getItems().forEach((item) => {
            if (!this.userPaths.includes(item)) {
                sorted.push(item);
            }
            item.remove(); //preserves reference
        });

        sorted.forEach((elem) => userLayer.addChild(elem));

        this.svg = paper.project.exportSVG({
            asString: true,
        });

        console.log("USER: ", this.userPaths.length);
        console.log("AI: ", sorted.length - this.userPaths.length);
        console.log("Sorted: ", sorted);
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
            this.sortPaths();
            setLineLabels(userLayer);
            document.getElementById("calc-lines").innerHTML = `Add : 0`;

            this.updateDrawer({
                status: "draw",
                svg: svg || this.svg,
                hasRegion: withRegion,
                frameSize: this.frameSize,
                prompt: this.prompt,
                lines: disableLines ? 0 : this.initRandomCurves ? this.addLines : 0,
                fixation: this.useFixation,
            });
            this.step = 0;
            this.clipDrawing = true;
            setActionUI(disableLines ? "refining" : "drawing");
        } else {
            throw new Error("Can't continue if already running");
        }
    }
    newExploreSketch(sketchCountIndex) {
        if (!this.clipDrawing) {
            if (!exemplarSize) {
                console.error("exemplars not found");
            }
            this.targetDrawing = true;
            setLineLabels(userLayer);
            document.getElementById("calc-lines").innerHTML = `Add : 0`;

            this.updateDrawer({
                status: "add_new_exemplar",
                svg: this.svg,
                hasRegion: false,
                frameSize: exemplarSize,
                prompt: this.prompt,
                lines: this.addLines,
                sketchScopeIndex: sketchCountIndex,
                fixation: this.useFixation,
            });
        }
    }
    continueSketch() {
        if (!this.clipDrawing) {
            this.clipDrawing = true;

            // if (this.targetDrawing) {
            //     explorer.childNodes.forEach((child, i) => {
            //         try {
            //             this.sortPaths();
            //             // TO DO CHANGE
            //             setLineLabels(userLayer);
            //             document.getElementById("calc-lines").innerHTML = `Add : 0`;

            //             this.updateDrawer({
            //                 status: "continue_single_sketch",
            //                 svg: this.svg,
            //                 frameSize: this.frameSize, //can remove?
            //                 fixation: this.useFixation,
            //                 sketchScopeIndex: sketchController.scopeRef[i],
            //             });
            //             setActionUI("continue-explore");
            //         } catch (e) {
            //             console.log("Problem with update");
            //         }
            //     });
            // } else {

            try {
                this.sortPaths();
                setLineLabels(userLayer);
                document.getElementById("calc-lines").innerHTML = `Add : 0`;

                this.updateDrawer({
                    status: "continue_sketch",
                    svg: this.svg,
                    frameSize: this.frameSize, //can remove?
                    fixation: this.useFixation,
                    userPaths: this.userPaths.length,
                });
                setActionUI("continuing");
            } catch (e) {
                console.log("Problem with update");
            }
            // }
        } else {
            throw new Error("Can't continue if already running");
        }
    }
    prune() {
        if (!this.clipDrawing) {
            this.clipDrawing = true;
            this.sortPaths();
            this.updateDrawer({
                status: "prune",
            });
            setActionUI("pruning");
        }
    }
    stop() {
        this.updateDrawer({ status: "stop" });
        setActionUI("stop");
    }
    pause() {
        this.updateDrawer({ status: "stop" });
        this.clipDrawing = false;
        setActionUI("pause");
    }
    stopSingle(i) {
        this.updateDrawer({
            status: "stop_single_sketch",
            sketchScopeIndex: i,
        });
    }
    resetMetaControls() {
        document.getElementById("prune").classList.add("inactive-action");
        console.log("clear");
        document.getElementById("history-block").style.display = "none";
        this.step = 0;
        this.stack.historyHolder = [{ svg: "" }];
        timeKeeper.setAttribute("max", "0");
        timeKeeper.value = "0";
    }
}

sketchController = new SketchHandler();