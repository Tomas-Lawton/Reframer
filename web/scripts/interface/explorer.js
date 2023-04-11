const removeExploreSketches = () => {
    if (controller.exploreScopes.length > 0) {
        explorerPanel.firstElementChild.childNodes.forEach((child, i) => {
            let stopButton = child.querySelector(".fa-hand");
            let loader = child.querySelector(".card-loading");
            loader.classList.remove("button-animation");
            loader.classList.remove("fa-spinner");
            loader.classList.add("fa-check");
            stopButton.style.background = "#f5f5f5";
            stopButton.style.background = "#d2d2d2";
            controller.stopSingle(controller.exploreScopes[i]);
        });
        controller.exploreScopes = [];
    }
};

const generateExploreSketches = () => {
    // To do: make sketches fit in place holder rather than replace

    // Remove the place holder ones
    total = 4;
    // for (let i = 0; i < 4; i++) {
    //     explorerPanel.firstElementChild.removeChild(
    //         explorerPanel.firstElementChild.firstElementChild
    //     );
    // }
    // Replace
    // for (let i = 0; i < 4; i++) {
    //     let sketch = new Sketch(
    //         controller.sketchScopeIndex,
    //         sketchScope,
    //         sketchSize,
    //         "AI"
    //     );
    //     let newElem = sketch.renderMini();
    //     controller.exploreScopes.push(controller.sketchScopeIndex);
    //     explorerPanel.firstElementChild.appendChild(newElem);
    //     controller.newExploreSketch(controller.sketchScopeIndex);
    //     controller.sketchScopeIndex += 1;
    // }

    controller.startExplorer();

    controller.clipDrawing = true;
    setActionState("explore");
    mainSketch.svg = paper.project.exportSVG({
        asString: true,
    });
    logger.event("start-exploring");
};

const emptyExplorer = () => {
    removeExploreSketches();
    controller.clipDrawing = false;
    // refactor into function
    for (let i = 0; i < 4; i++) {
        if (explorerPanel.firstElementChild) {
            explorerPanel.firstElementChild.removeChild(
                explorerPanel.firstElementChild.firstChild
            );
            let sketch = new Sketch(null, defaults, sketchSize);
            let newElem = sketch.renderMini();
            explorerPanel.firstElementChild.appendChild(newElem);
            newElem.classList.add("inactive-sketch");
        }
    }
};

const dimensionInputs = document.querySelectorAll(".input-container input");
const dimensionLabels = document.querySelectorAll(".dimension-label");
const clearButtons = document.querySelectorAll(".input-container i");

dimensionInputs.forEach(child => {
    child.addEventListener("input", (e) => {
        e.target.name === "d0" ? dimensionLabels[1].innerHTML = e.target.value : dimensionLabels[0].innerHTML = e.target.value; 
        controller["behaviours"][e.target.name] = e.target.value;
    });
    console.log(controller)
});

clearButtons.forEach(child => {
    child.addEventListener("click", (e) => {
        let i = child.getAttribute("name");
        if (i === "x-d0") {
            dimensionInputs[0].value = "" ;
            dimensionLabels[1].innerHTML = "";
        } else {
            dimensionInputs[1].value = "";
            dimensionLabels[0].innerHTML = ""; 
        }
        controller["behaviours"][i === "x-d0" ? "d0" : "d1"] = "";
    }); 
});


document.querySelector(".explorer-header-actions button").addEventListener("click", e => {
    // trigger generation with dimensions.
})