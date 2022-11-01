const useTool = false;

const socketLight = document.querySelector(".socket-connect");
const canvas = document.getElementById("canvas");

// General UI
const prompt = document.getElementById("messageText");
const modal = document.getElementById("modal");
const controlPanel = document.querySelector(".control-panel");
const controlDrawer = document.querySelector(".control-drawer");
const sketchBook = document.getElementById("sketchbook-panel");
const message = document.getElementById("message");
const drawer = document.querySelector(".drawer-button");

const timeKeeper = document.getElementById("time-slider");
const historyBlock = document.querySelector(".history-block");

const localPrompts = document.querySelector(".local-prompts");
const explorerSize = document.getElementById("sketch-size");

const sparkUI = document.querySelector(".spark-ui");
const sparkKnob = document.querySelector(".spark-knob");

const buttonPanel = document.querySelector(".action");
const dropdown = document.querySelector(".pen-dropdown");
const staticSketches = document.getElementById("static-sketches");
const explorerPanel = document.querySelector(".explore-panel");
const sketchGrid = document.getElementById("grid-container");
const pen = document.getElementById("pen");
// Actions
const actionControls = document.querySelectorAll(".action-button");
const aiCard = document.getElementById("describe-card");
// Selected UI
const deleteHandler = document.getElementById("delete-handler");
const rotateSlider = document.getElementById("rotate-slider");
const copyHandler = document.getElementById("copy-handler");
const rotateNumber = document.getElementById("rotate-number");
const fixedHandler = document.getElementById("fixed-handler");
const scaleSlider = document.getElementById("scale-slider");
const scaleNumber = document.getElementById("scale-number");
const moveUp = document.getElementById("moveUp");
const sendToBack = document.getElementById("toBack");
const transformControl = document.getElementById("transform-ui");

const controllerUI = document.querySelectorAll(".inactive-section");
const sketchTemplate = document.getElementById("sketch-template");
const eyeDropper = document.getElementById("dropper");

const styles = document.querySelector(".drawing-tool-panel");
const penTool = document.querySelector(".pen-tool");
const eraseTool = document.querySelector(".erase-tool");
const selectTool = document.querySelector(".pointer-tool");
const toolToggle = document.querySelector(".style-window-toggle");
const toolWindow = document.querySelector(".tool-view");

const accordionItem = document.querySelector(".accordion-item");
const header = document.querySelector(".accordion-item-header");
const body = document.querySelector(".accordion-item-body");

const undoButton = document.querySelector(".undo");
const redoButton = document.querySelector(".redo");

const pickerSelect = document.getElementById("picker-ui");

const respectSlider = document.getElementById("respect-slider");

const sparkCanvas = document.querySelector(".sparkline");

const hint = document.querySelector(".hint-text");

const artBoard = document.querySelector(".canvas-ui-container");
const frameName = document.querySelector(".canvas-ui-container>p");
const sketchContainer = document.getElementById("canvas-drop");
const canvasBounds = canvas.getBoundingClientRect();
const project = document.querySelector(".project");
const projectBounds = project.getBoundingClientRect();

const frameDropIn = document.querySelectorAll(".canvas-focus");

const sketchSize = 190;

let size, frameOutline, scaleRatio;
const setCanvasSize = () => {
    size = project.clientHeight * 0.91; //technically wrong
    sketchContainer.style.width = size + "px";
    sketchContainer.style.height = size + "px";
    canvas.width = size;
    canvas.height = size;
    sparkCanvas.height = 100;
    sparkCanvas.width = sparkUI.clientWidth;
    frameOutline = size;
    scaleRatio = frameOutline / 224;
    artBoard.style.left =
        (window.innerWidth - controlPanel.clientWidth - size) / 2 +
        controlPanel.clientWidth +
        size / 2 +
        "px";
    artBoard.style.top = (window.innerHeight - size) / 2 + size / 2 + 20 + "px";
};

setCanvasSize();
window.addEventListener("resize", () => setCanvasSize, true);

const reusableExemplar = sketchTemplate.cloneNode(true); //clone to use
sketchTemplate.remove();