const ws = new WebSocket("ws://localhost:8000/ws");
const localHost = "http://localhost:8000";

// Sketch
const canvas = document.getElementById("canvas");

// Main UI
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
const continueButton = document.getElementById("continue");
const generateButton = document.getElementById("generate");

// Select UI
const deleteHandler = document.getElementById("delete-handler");
const rotateHandler = document.getElementById("rotate-handler");
const initialiseHandler = document.getElementById("initialise-handler");

// Default draw settings
let strokeColor = "#181818";
let strokeWidth = 12;
let opacity = 0.8; //ink feel
let penMode = "pen";
let clipDrawing = false;
let buttonControlLeft = true;
let showTraces = true;
let step = 1;
let myPath,
    regionPath,
    drawRegion,
    currentSelectedPath,
    lastRender,
    lastPrompt,
    erasePath,
    tmpGroup,
    mask,
    isFirstIteration,
    lastRollingLoss,
    traces,
    boundingBox,
    exemplarSize;
let undoStack = [];
let redoStack = [];
let historyHolder = [];

// Adjust square canvases
setTimeout(() => {
    let squares = document.querySelectorAll(".square");
    exemplarSize = squares[0].getBoundingClientRect().width;
    exemplars.forEach((exemplar) => {
        exemplar.style.width = exemplarSize + "px";
        exemplar.style.height = exemplarSize + "px";
    });
}, 100);

// Setup
paper.install(window);

// For sketching
const scope = new PaperScope();
scope.setup(canvas);

// For exemplars

const canvas1 = document.getElementById("canvas1");
const canvas2 = document.getElementById("canvas2");
const canvas3 = document.getElementById("canvas3");
const canvas4 = document.getElementById("canvas4");
const exemplars = [canvas1, canvas2, canvas3, canvas4];

const exemplarScope = new PaperScope();
exemplarScope.setup(canvas1);
exemplarScope.setup(canvas2);
exemplarScope.setup(canvas3);
exemplarScope.setup(canvas4);
console.log(exemplarScope);

scope.activate();

const userLayer = new Layer(); //for drawing + erase mask
timeKeeper.style.width = "0";

const multiTool = new Tool();
multiTool.minDistance = 5;
const eraseTool = new Tool();
eraseTool.minDistance = 10;