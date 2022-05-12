const ws = new WebSocket("ws://localhost:8000/ws");

// Sketching UI
const canvas = document.getElementById("canvas");
const exemplars = [
    document.getElementById("canvas1"),
    document.getElementById("canvas2"),
    document.getElementById("canvas3"),
    document.getElementById("canvas4"),
];

// Actions
const actionControls = document.querySelectorAll(".ai-action");

// Select UI
const deleteHandler = document.getElementById("delete-handler");
const rotateSlider = document.getElementById("rotate-slider");
const scaleSlider = document.getElementById("scale-slider");
const initialiseHandler = document.getElementById("initialise-handler");
const transformControl = document.getElementById("transform-ui");

// General UI
const prompt = document.getElementById("messageText");
const modal = document.getElementById("modal");
const controlPanel = document.getElementById("control-panel");
const buttonPanel = document.getElementById("button-panel");
const artControls = document.getElementById("art-panel");
const penControls = document.getElementById("pen-controls");
const selectControls = document.getElementById("select-controls");
const message = document.getElementById("message");
const palette = document.getElementById("palette");
const timeKeeper = document.getElementById("time-slider");
const lossText = document.getElementById("rolling-loss");
const setTraces = document.getElementById("num-traces");
const selectDot = document.getElementById("contain-pen-dot");
const opacitySlider = document.getElementById("opacity-slider");

// Utility
let step = 1;
let doneTransform = 500;
let myPath, erasePath, regionPath, tmpGroup, mask;

const padding = parseInt(
    window
    .getComputedStyle(document.getElementById("contain-canvas"), null)
    .getPropertyValue("padding-left")
);
const exemplarSize = document
    .querySelector(".exemplar-canvas")
    .getBoundingClientRect().width;
const containerRect = document
    .getElementById("contain-canvas")
    .getBoundingClientRect();

if (containerRect.width > window.innerHeight) {
    canvas.width = window.innerHeight - 2 * padding;
    canvas.height = window.innerHeight - 2 * padding;
} else {
    canvas.height = containerRect.width - 2 * padding;
    canvas.width = containerRect.width - 2 * padding;
}

const scaleRatio = canvas.width / exemplarSize;
// const importToSketch = () => {
//     // Clear the sketch
//     // scale the whole exemplar
//     let expandedExemplar = exemplar.scale(scaleRatio);
//     // import each path individually.
//     expandedExemplar.getItems.forEach((item) => {
//         userLayer.importChild(item);
//     });
// };

// Paper Setup
paper.install(window);
const scope = new PaperScope();
const exemplarScope = new PaperScope();

exemplars.forEach((exemplar) => {
    exemplar.width = exemplarSize;
    exemplar.height = exemplarSize;
    exemplarScope.setup(exemplar);
});
exemplarScope.activate();
// exemplarScope.projects.forEach((project) => project.activate());
scope.setup(canvas);
scope.activate();

const userLayer = new Layer(); //for drawing + erase mask
const multiTool = new Tool();
const eraseTool = new Tool();

timeKeeper.style.width = "0";
multiTool.minDistance = 5;
eraseTool.minDistance = 10;

const maxPointSize = 79.99;
document.getElementById("width-slider").setAttribute("max", maxPointSize);
class SimpleStack {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.historyHolder = [];
    }
}

class SketchHandler {
    // Maintains a logical state for sending over WS
    constructor() {
        this.drawState = null;

        // Sketching Data
        this.prompt = null;
        this.svg = null;
        this.frameSize = canvas.getBoundingClientRect().width;

        // Defaults
        this.strokeColor = "#181818";
        this.strokeWidth = 12;
        this.opacity = 0.75;
        this.penMode = "pen";
        this.clipDrawing = false;
        this.maximumTraces = 1; // todo change

        // TODO Refactor
        this.buttonControlLeft = true;
        this.showTraces = true;

        // User Initialised
        this.drawRegion = null;
        this.lastRender = null;
        this.lastPrompt = null;
        this.isFirstIteration = null;
        this.lastRollingLoss = null;
        this.traces = null;
        this.boundingBox = null;
        this.rotationGroup = null;

        // Settings panel
        this.useAdvanced = false;
        this.initRandomCurves = true;
        this.numRandomCurves = 32;
        this.numTraces = 1;

        // Undo/redo stack
        this.stack = new SimpleStack();
    }
    updateDrawer({ status, svg, hasRegion, frameSize, prompt }) {
        timeKeeper.style.visibility = "visible";
        mainSketch.isFirstIteration = true; //reset canvas
        const canvasBounds = canvas.getBoundingClientRect(); //avoid canvas width glitches
        mainSketch.lastPrompt = prompt;
        const res = {
            status: status,
            data: {
                prompt: prompt,
                svg: svg,
                frame_size: frameSize,
                region: {
                    activate: hasRegion,
                    x1: mainSketch.drawRegion ? mainSketch.drawRegion.x : 0,
                    y1: mainSketch.drawRegion ?
                        canvasBounds.height - mainSketch.drawRegion.y :
                        0,
                    x2: mainSketch.drawRegion ?
                        mainSketch.drawRegion.x + mainSketch.drawRegion.width :
                        canvasBounds.width,
                    y2: mainSketch.drawRegion ?
                        canvasBounds.height -
                        mainSketch.drawRegion.y -
                        mainSketch.drawRegion.height // use non-web y coords
                        :
                        canvasBounds.height, // same as width
                },
            },
        };
        ws.send(JSON.stringify(res));
        console.log(res);
    }
    draw(withRegion = false) {
        if (noPrompt()) {
            openModal({
                title: "Type a prompt first!",
                message: "You need a target for AI sketching.",
            });
            return;
        }
        this.updateDrawer({
            status: "draw",
            svg: this.svg,
            hasRegion: withRegion,
            frameSize: this.frameSize,
            prompt: this.prompt,
        });
        this.clipDrawing = true;
        this.drawState = "active";
        setActionUI("active");
    }
    generate() {
        if (noPrompt()) {
            openModal({
                title: "Type a prompt first!",
                message: "You need a target for AI exemplars.",
            });
            return;
        }
        this.updateDrawer({
            status: "sketch_exemplars",
            svg: this.svg,
            hasRegion: false,
            frameSize: exemplarSize,
            prompt: this.prompt,
        });
        this.clipDrawing = true;
        this.drawState = "active";
        setActionUI("active");
    }
    redraw() {
        this.updateDrawer({
            status: "redraw",
        });
        this.clipDrawing = true;
        this.drawState = "active";
        setActionUI("active");
    }
    continue () {
        this.updateDrawer({
            status: "continue",
            frameSize: this.frameSize, //can remove?
        });
        this.clipDrawing = true;
        this.drawState = "active";
        setActionUI("active");
    }
    stop() {
        this.updateDrawer({ status: "stop" });
        this.clipDrawing = false;
        this.drawState = "stop";
        setActionUI("stop");
    }
    resetHistory() {
        step = 0; // reset since not continuing
        mainSketch.stack.historyHolder = [{ svg: "" }];
        timeKeeper.style.width = "0";
        timeKeeper.setAttribute("max", "0");
        timeKeeper.value = "0";
    }
}

mainSketch = new SketchHandler();

if (window.innerWidth <= 990) {
    const aiCard = document.getElementById("describe-card");
    document.querySelector("body").prepend(aiCard);
    document
        .getElementById("right-background")
        .prepend(document.getElementById("moodboard-header"));
} else {
    setPenMode("pen", document.getElementById("pen"));
}

// Random partial sketch
// const partial = userLayer.importSVG(sketches[Math.floor(Math.random() * 3)]);
// partial.scale(1000);
// // TO DO: Scale to canvas size
// partial.set({
//     position: new Point(540, 540),
//     strokeWidth: mainSketch.strokeWidth,
//     opacity: mainSketch.opacity,
//     strokeCap: "round",
//     strokeJoin: "round",
// });
// partial.getItems().forEach((path) => userLayer.addChild(path));
// partial.remove();