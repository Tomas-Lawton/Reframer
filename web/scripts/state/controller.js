class Controller {
    // Maintains a logical state for sending over WS
    constructor() {
        this.drawState;
        // Sketching Data
        this.prompt = null;
        this.d0 = null;
        this.d1 = null;
        this.exploreScopes = [];
        this.sketches = {};
        this.activeExplorers = {};

        // Defaults
        this.strokeColor = "rgb(24,24,24)";
        this.strokeWidth = 28;
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
        this.lastPrompt = null;
        this.isFirstIteration = null;
        this.traces = null;
        this.boundingBox = null;
        this.transformGroup = null;
        this.learningRate = 0.5;
        this.showAllLines = true;
        this.targetDrawing = false;

        // Settings panel
        this.useAdvanced = false;
        this.initRandomCurves = true;
        this.maxCurves = 95;
        this.addLines = 0;
        this.numTraces = 1;

        this.liveCollab = false;
        this.previousDrawState;
    }
    updateDrawer({
        status,
        sketch,
        frame_size,
        prompt,
        random_curves,
        sketch_index,
        rate,
        frames,
    }) {
        this.isFirstIteration = true; //reset canvas
        this.lastPrompt = prompt;
        const res = {
            status: status,
            data: {
                prompt,
                sketch,
                random_curves,
                frame_size,
                rate,
                frames,
                sketch_index,
            },
        };
        ws.send(JSON.stringify(res));
        console.log("Update: ", res)
    }
    newExploreSketch(sketchCountIndex) {
        if (!this.clipDrawing) {
            if (!sketchSize) {
                console.error("sketch size not found");
            }
            this.activeExplorers[sketchCountIndex] = true; //keep track of running seperate from sketch data
            this.targetDrawing = true;
            this.prepare();

            this.updateDrawer({
                status: "add_new_sketch",
                sketch: mainSketch.sketch,
                frame_size: mainSketch.frameSize,
                prompt: this.prompt,
                random_curves: this.addLines,
                sketch_index: sketchCountIndex,
                rate: this.learningRate,
                frames: Object.values(mainSketch.localFrames).map((elem) => elem.data),
            });
        }
    }
    stop() {
        sketchHistory.historyHolder.push({
            svg: mainSketch.svg,
            loss: mainSketch.semanticLoss,
        });
        this.updateDrawer({ status: "stop" });
    }
    stopSingle(i) {
        this.updateDrawer({
            status: "stop_single_sketch",
            sketch_index: i,
        });
    }
    prepare() {
        ungroup();
        mainSketch.sketchLayer.getItems().forEach((path) => {
            path.selected = false;
        });
        mainSketch.buildSketch();
        setLineLabels(mainSketch.sketchLayer);
        // document.getElementById("calc-lines").innerHTML = `Add : 0`;
    }
    resetMetaControls() {
        historyBlock.style.display = "none";
        timeKeeper.setAttribute("max", "0");
        timeKeeper.value = "0";
        sketchHistory.historyHolder = [];
    }
}

controller = new Controller();