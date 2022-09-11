// General UI
const prompt = document.getElementById("messageText");
const modal = document.getElementById("modal");
const controlPanel = document.getElementById("control-panel");
const sketchBook = document.getElementById("sketchbook-panel");
const penControls = document.getElementById("pen-controls");
const message = document.getElementById("message");
const palette = document.getElementById("palette");
const timeKeeper = document.getElementById("time-slider");
const localPrompts = document.getElementById("local-prompts");
// const lossText = document.getElementById("rolling-loss");
const setTraces = document.getElementById("num-traces");
const selectDot = document.getElementById("contain-pen-dot");
const alphaSlider = document.getElementById("alpha-slider");
const stopButton = document.getElementById("stop");
const focusButton = document.getElementById("focus");
const buttonPanel = document.querySelector(".action");
const dropdown = document.getElementById("pen-dropdown");
const aiMessage = document.getElementById("message");
const sketchContainer = document.getElementById("canvas-drop");
const staticSketches = document.getElementById("static-sketches");
const explorer = document.getElementById("explore-sketches");
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

const styles = document.querySelector(".draw-tools");
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

// Sketching UI
const canvas = document.getElementById("canvas");
const backDrop = document.getElementById("contain-canvas");
const sketchSize = 100;
const canvasFrame = Math.min(canvas.width, canvas.height);
const scaleRatio = canvasFrame / 224;
const padding = parseInt(
    window.getComputedStyle(backDrop, null).getPropertyValue("padding")
);
const containerRect = backDrop.getBoundingClientRect();

if (containerRect.width > window.innerHeight) {
    canvas.width = window.innerHeight - padding * 2;
    canvas.height = window.innerHeight - padding * 2;
} else {
    canvas.height = containerRect.width - padding * 2;
    canvas.width = containerRect.width - padding * 2;
}

const reusableExemplar = sketchTemplate.cloneNode(true); //clone to use
sketchTemplate.remove();