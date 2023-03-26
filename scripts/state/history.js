class SketchHistory {
    constructor(s) {
        this.undoStack = [];
        this.redoStack = [];
        this.historyHolder = [];
        this.sketch = s;
    }
    pushUndo() {
        ungroup();
        this.undoStack.push({
            svg: paper.project.exportSVG({
                asString: true,
            }),
        });

        this.undoStack.length > 0 ?
            (undoButton.style.color = "#7b66ff") :
            (undoButton.style.color = "#757575");
    }
    pushRedo() {
        ungroup();

        this.redoStack.push({
            svg: paper.project.exportSVG({
                asString: true,
            }),
        });

        this.redoStack.length > 0 ?
            (redoButton.style.color = "#7b66ff") :
            (redoButton.style.color = "#757575");
    }
    undo() {
        if (this.undoStack.length > 0) {
            ungroup();

            let last = this.undoStack.pop();
            this.pushRedo();

            this.sketch.sketchLayer.clear();
            this.sketch.load(1, last.svg); //change to fixed list
            this.undoStack.length === 0 && (undoButton.style.color = "#757575");
        }
    }
    redo() {
        if (this.redoStack.length > 0) {
            ungroup();

            let last = this.redoStack.pop();
            this.pushUndo();
            this.sketch.sketchLayer.clear();
            this.sketch.load(1, last.svg); //change to fixed list
            // logger.event("redo");

            this.redoStack.length === 0 && (redoButton.style.color = "#757575");
        }
    }
    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }

    // To Do: Move time slider logic here I think
}

sketchHistory = new SketchHistory(mainSketch);