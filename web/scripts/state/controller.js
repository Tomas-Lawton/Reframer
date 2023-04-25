class Controller {
    // The controller maintains drawing state.
    constructor() {
        this.drawState;
        // Sketching Data
        this.prompt = null;
        this.sketches = {};
        this.activeExplorers = {};

        // Defaults
        this.strokeColor = "rgb(24,24,24)";
        this.strokeWidth = 14;
        this.alpha = 1;
        this.penMode = "pen";
        this.clipDrawing = false;
        this.maximumTraces = 1; // todo change
        this.linesDisabled = false;
        this.lastHistoryIndex = 0;
        // this.penDropMode = "select";
        this.sketchScopeIndex = 0;
        // TODO Refactor
        this.buttonControlLeft = true;
        this.doneSketching = null;

        // User Initialised
        this.drawRegion = null;
        this.selectionBox = null;
        this.traces = null;
        this.boundingBox = null;
        this.transformGroup = null;
        this.learningRate = 0.5;
        this.showAllLines = true;

        // Settings panel
        this.useAdvanced = false;
        this.initRandomCurves = true;
        this.maxCurves = 95;
        this.addLines = 0;
        this.numTraces = 1;

        this.liveCollab = false;
        this.previousDrawState;

        this.behaviours = {
            d0: { name: null, value: null },
            d1: { name: null, value: null },
        }
    }
    draw() {
        this.clipDrawing = true;
        this.targetDrawing = false;
        mainSketch.svg = paper.project.exportSVG({
            asString: true,
        });
        sketchHistory.historyHolder.push({
            svg: mainSketch.svg,
            loss: mainSketch.semanticLoss,
        });
        sketchHistory.pushUndo();
        this.prepare();
        socket.send(JSON.stringify({
            status: "draw",
            user_data: {
                prompt: this.prompt,
                sketch: mainSketch.sketch,
                frame_size: mainSketch.frameSize,
                random_curves: this.addLines,
                learning_rate: this.learningRate,
            }
        }));
    }
    pause() {
        if (this.drawState === "draw") {
            this.previousDrawState = this.drawState
            console.log("Pausing");
            controller.liveCollab = true;
            socket.send(JSON.stringify({ status: "stop" }))
            this.clipDrawing = false;
            controller.drawState = "pause";
            document.querySelector(".current-status").style.color = "#ff9700";
            document.querySelector(".current-status").innerHTML = "Waiting";
        }
    }
    continueSketch() {
        if (!this.clipDrawing) {
            this.clipDrawing = true;
            try {
                sketchHistory.historyHolder.push({
                    svg: mainSketch.svg,
                    loss: mainSketch.semanticLoss,
                });
                sketchHistory.pushUndo();
                this.prepare();
                socket.send(JSON.stringify({
                    status: "continue_sketch", user_data: {
                        sketch: mainSketch.sketch,
                        learning_rate: this.learningRate,
                    }
                }))
                setActionState(this.previousDrawState);
            } catch (e) {
                console.log("Problem with update");
            }
        }
    }
    startExplorer() {
        console.log('t?')

        if (!this.clipDrawing) {
            console.log('d?')

            this.clipDrawing = true;
            console.log('wnqwfd?')

            this.prepare();
            console.log('sewnd?')
            socket.send(JSON.stringify({
                status: "explore_diverse_sketches",
                user_data: {
                    prompt: this.prompt,
                    behaviours: this.behaviours,
                    sketch: mainSketch.sketch,
                    frame_size: mainSketch.frameSize,
                    random_curves: this.addLines,
                    rate: this.learningRate,
                },
            }));
        }
    }
    prepare() {
        ungroup();
        mainSketch.sketchLayer.getItems().forEach((path) => {
            path.selected = false;
        });
        mainSketch.buildSketch();
        setLineLabels(mainSketch.sketchLayer);
    }
}

controller = new Controller();