const loadingBar = document.querySelector(".loading-container")

const removeSketches = () => {
    for (const [key, sketch] of Object.entries(controller.sketches)) {
        if (key !== 'main-sketch') {
            sketch.scope.remove();
            sketch.elem.remove()
        }
    }
};


const generateExploreSketches = () => {
    for (let i = 0; i < 16; i++) {
        // create paper.js scopes
        let sketch = new Sketch(
            i,
            sketchScope,
            sketchSize,
            "AI"
        );
        // create ui
        diverseSketcheContainer.appendChild(
            sketch.renderMini()
        );
    }

    controller.startExplorer();

    controller.clipDrawing = true;
    mainSketch.svg = paper.project.exportSVG({
        asString: true,
    });

    logger.event("start-exploring");
};

const dimensionInputs = document.querySelectorAll(".input-container input");
const dimensionLabels = document.querySelector(".dimension-label");
const clearButtons = document.querySelectorAll(".input-container i");
const updateLabels = () => {
    let d1 = controller["behaviours"]["d0"]["name"]
    let d2 = controller["behaviours"]["d1"]["name"]
    dimensionLabels.innerHTML = `${d1 || "Dimension One"} (Top-Bottom) ${d2 ? `vs ${d2} (Left-Right)` : ""}`;
}

dimensionInputs.forEach(child => {
    child.addEventListener("input", (e) => {
        controller["behaviours"][e.target.name]["name"] = e.target.value;
        updateLabels()
    });
    console.log(controller)
});

clearButtons.forEach(child => {
    child.addEventListener("click", (e) => {
        let i = child.getAttribute("name");
        controller["behaviours"][i === "x-d0" ? "d0" : "d1"]["name"] = "";

        if (i === "x-d0") {
            dimensionInputs[0].value = "";
            updateLabels();
        } else {
            dimensionInputs[1].value = "";
            updateLabels();
        }
    });
});


// document.querySelector(".explorer-header-actions button").addEventListener("click", e => {
//     // trigger generation with dimensions.
// })

explorerPanel.onmousedown = (e) => {
    let bounds = explorerPanel.firstElementChild.getBoundingClientRect();
    e = e || window.event;
    pos3 = e.clientX;
    pos4 = e.clientY;
    if (
        pos3 < bounds.left ||
        pos3 > bounds.right ||
        pos4 < bounds.top ||
        pos4 > bounds.bottom
    ) {
        document.onmouseup = closeDragElement;
        document.onmousemove = (e) => elementDrag(e, explorerPanel);
    }
};
