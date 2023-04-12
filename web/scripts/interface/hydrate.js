const picker = new Picker({
    parent: document.getElementById("color-picker"),
    popup: false,
    alpha: false,
    defaultColor: "#0cf",
    editor: false,
    editorFormat: "hex", // or 'rgb', 'hsl'
});

picker.setColor(controller.strokeColor);
picker.onChange = (color) => {
    controller.strokeColor = color.rgbaString;
    controller.strokeColor = getRGBA(controller.alpha);

    getSelectedPaths().forEach(
        (item) => (item.strokeColor = controller.strokeColor)
    );
    setThisColor(controller.strokeColor);
};

setLineLabels(mainSketch.sketchLayer);
setActionState("inactive");
hide(historyBlock);
setPointSize(controller.strokeWidth);
setThisColor("rgb(54 54 54)");



// TO DO Add back in
const defaults = new PaperScope();
defaults.activate();
for (let i = 0; i < 4; i++) {
    let sketch = new Sketch(null, defaults, sketchSize);
    let newElem = sketch.renderMini();
    newElem.classList.add("inactive-sketch");
    diverseSketcheContainer.appendChild(newElem);
}


pickerSelect.style.display = "none";


    hide(explorerPanel);
