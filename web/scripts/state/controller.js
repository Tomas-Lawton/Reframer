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
        this.activeStates = [
            "draw",
            "explore",
            "pause", //for continue
        ];
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
            this.updateDrawer({
                status: "draw",
                prompt: this.prompt,
                sketch: mainSketch.sketch,
                frame_size: mainSketch.frameSize,
                random_curves: this.addLines,
                rate: this.learningRate,
            });
    }
    pause() {
        if (
            //todo refactor
          (  (this.drawState !== "explore" && //don't include this state
                this.activeStates.includes(controller.drawState)) ||
            this.drawState === "active-frame" ) && this.drawState !== "pause"
        ) {
            this.previousDrawState = this.drawState
            console.log("Pausing");
            document.querySelector(".current-status").style.color = "#ff9700";
            document.querySelector(".current-status").innerHTML = "Waiting";

            controller.liveCollab = true;
            this.updateDrawer({ status: "stop" });
            this.clipDrawing = false;
            controller.drawState = "pause";
            // setActionState("pause");
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
                this.updateDrawer({
                    status: "continue_sketch",
                    sketch: mainSketch.sketch,
                    rate: this.learningRate,
                    frames: Object.values(mainSketch.localFrames).map((elem) => elem.data)
                });
                setActionState(this.previousDrawState);
            } catch (e) {
                console.log("Problem with update");
            }
        }
    }
    startExplorer() {
        if (!this.clipDrawing) {
            this.prepare();
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


            // TO DO MOVE TO SOCKET RESPONSE EVENT IN HANDLER
            console.log(response);
            if (response.status === "returned_diverse_sketches") {
                response.diverse_sketches.map((exemplar, i) => 
                    controller.sketches[i.toString()].load(
                        sketchSize / 224,
                        exemplar.svg,
                        exemplar.fixed,
                    ));
                hide(loadingBar)

                let loaders = diverseSketcheContainer.querySelectorAll(".card-loading").forEach(elem => {
                    elem.classList.remove("button-animation");
                    elem.classList.remove("fa-spinner");
                    elem.classList.add("fa-check");
                });

                controller.clipDrawing = false;
                setActionState("inactive");
                show(explorerPanel)
                logger.event("stop-exploring");
                // setModeDefault();
            }
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