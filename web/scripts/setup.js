const ws = new WebSocket("ws://localhost:8000/ws");

const canvas = document.getElementById("canvas");
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

const drawButton = document.getElementById("draw");
const redrawButton = document.getElementById("redraw");
// const continueButton = document.getElementById("continue");
const generateButton = document.getElementById("generate");
const stopButton = document.getElementById("stop");

const deleteHandler = document.getElementById("delete-handler");
const rotateHandler = document.getElementById("rotate-slider");
const scaleHandler = document.getElementById("scale-slider");
const initialiseHandler = document.getElementById("initialise-handler");
const transformControl = document.getElementById("transform-ui");

// Utility
let step = 1;
let doneTransform = 500;
let myPath, erasePath, regionPath, tmpGroup, mask;

// const exemplarSize = document
//     .querySelector(".square")
//     .getBoundingClientRect().width;
const exemplarSize = 252.31;

// Paper Setup
paper.install(window);
const scope = new PaperScope();
const exemplarScope = new PaperScope();

// Exemplars
const exemplars = [
    document.getElementById("canvas1"),
    document.getElementById("canvas2"),
    document.getElementById("canvas3"),
    document.getElementById("canvas4"),
];
exemplars.forEach((exemplar) => {
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