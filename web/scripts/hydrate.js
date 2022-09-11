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
setActionUI("inactive");
setPointSize(controller.strokeWidth);

const defaults = new PaperScope();
defaults.activate();
for (let i = 0; i < 4; i++) {
    let sketch = new Sketch(null, defaults, sketchSize);
    let newElem = sketch.renderMini();
    // controller.sketchScopeIndex += 1; //remove later
    newElem.classList.add("inactive-sketch");
    document.getElementById("explore-sketches").appendChild(newElem);
}

localPrompts.style.display = "none";
document.querySelector(".tool-view").style.display = "none";