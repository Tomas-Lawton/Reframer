// Drawing Controls
document.querySelectorAll(".pen-mode").forEach((elem) => {
    elem.addEventListener("click", () => {
        let lastPenMode = penMode;
        penMode = elem.id;

        switch (penMode) {
            case "erase":
                eraseTool.activate();
                moveSelecterTo(elem);
                break;
            case "pen":
                multiTool.activate();
                moveSelecterTo(elem);
                break;
            case "select":
                multiTool.activate();
                moveSelecterTo(elem);
                break;
            case "lasso":
                multiTool.activate();
                if (noPrompt()) {
                    penMode = lastPenMode;
                    openModal({
                        title: "Add a prompt first!",
                        message: "You need a prompt to generate sketches with the region tool.",
                    });
                    break;
                }
                moveSelecterTo(elem);
                break;
        }

        // Not-pen mode
        if (penMode !== "select") {
            userLayer.getItems().forEach((path) => {
                // console.log(path);
                path.selected = false;
            });
        }

        // if (penMode !== "pen" && penMode !== "select") {
        //     artControls.style.display = "none";
        // }
        if (penMode !== "lasso" && penMode !== "select") {
            drawRegion = undefined;
            if (regionPath) regionPath.remove();
        }
        if (penMode !== "lasso") {
            // userLayer.activate();
        }
        // console.log(penMode);
    });
});

document.getElementById("delete").addEventListener("click", () =>
    openModal({
        title: "Clearing Canvas",
        message: "Are you sure you want to delete your drawing? :(",
        confirmAction: () => {
            lastPrompt = null; //clear for draw (not redraw)
            drawButton.innerHTML = "Draw";
            userLayer.clear();
            // prompt.value = "";
            modal.style.display = "none";
        },
    })
);

document.body.addEventListener("keydown", function(event) {
    if (document.activeElement !== prompt) {
        deletePath(event.key);
    }
});

document.getElementById("draw").addEventListener("click", (e) => {
    if (!clipDrawing) {
        resetHistory(); //reset since not continuing
        startDrawing(prompt.value === lastPrompt ? "redraw" : "draw", false);
        drawButton.innerHTML = "Stop";
    } else {
        stopClip();
    }
    clipDrawing = !clipDrawing;
});
document.getElementById("continue").addEventListener("click", (e) => {
    if (!clipDrawing) {
        startDrawing("continue", false);
        continueButton.innerHTML = "Stop";
    } else {
        stopClip();
    }
    clipDrawing = !clipDrawing;
});

document.getElementById("begin").addEventListener("click", () => {
    document.getElementById("sliding-overlay").style.bottom = "100%";
});
// document.getElementById("switch-side").addEventListener("click", () => {
//     switchControls();
// });
document.getElementById("undo").addEventListener("click", () => {
    if (undoStack.length > 0) {
        const lastEvent = undoStack.pop();
        if (lastEvent.type === "draw-event") {
            let thisPath; //json from redo, otherwise path
            try {
                let temp = new Path();
                thisPath = temp.importJSON(lastEvent.data);
            } catch (e) {
                thisPath = lastEvent.data;
            }
            let copy = thisPath.exportJSON();
            redoStack.push({
                type: "draw-event",
                data: copy,
            }); //so remove does not remove reference
            thisPath.remove();
        }
        if (lastEvent.type === "delete-event") {
            let pathData = [];
            lastEvent.data.map((redrawPath) => {
                let thisPath = new Path();
                thisPath = thisPath.importJSON(redrawPath);
                pathData.push(thisPath);
            });
            redoStack.push({
                type: "delete-event",
                data: pathData, //use ref
            });
        }
        if (lastEvent.type === "erase-event") {
            // TO DO
        }
    }
});
document.getElementById("redo").addEventListener("click", () => {
    if (redoStack.length > 0) {
        const lastEvent = redoStack.pop();
        if (lastEvent.type === "draw-event") {
            let item = new Path();
            item.importJSON(lastEvent.data);
            undoStack.push(lastEvent);
        }
        if (lastEvent.type === "delete-event") {
            let pathList = [];
            lastEvent.data.map((path) => {
                let pathCopy = path.exportJSON();
                path.remove();
                pathList.push(pathCopy);
            });
            undoStack.push({
                type: "delete-event",
                data: pathList,
            }); // need to store a json to redraw
        }
        if (lastEvent.type === "erase-event") {
            // TO DO
        }
    }
});
document.getElementById("save").addEventListener("click", () => {
    userLayer.view.element.toBlob((blob) => {
        let url = window.URL || window.webkitURL;
        let link = url.createObjectURL(blob);
        // window.open(link, "_blank");

        let isIE = false || !!document.documentMode;
        if (isIE) {
            window.navigator.msSaveBlob(blob, fileName);
        } else {
            let a = document.createElement("a");
            a.setAttribute("download", "sketch.png");
            a.setAttribute("href", link);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    });
});
document.getElementById("width-slider").oninput = function() {
    strokeWidth = this.value;
};
// document.getElementById("scale-slider").oninput = function() {
//     let newScale = this.value / 10;
//     let selected = getSelectedPaths();
//     for (child of selected) {
//         child.applyMatrix = false;
//         child.scaling = newScale;
//     }
// };
// document.getElementById("rotate-slider").oninput = function() {
//     let angle = this.value;
//     console.log(angle);
//     let selected = getSelectedPaths();
//     for (child of selected) {
//         // implement all of these methods for selecting shapes
//         // http://sketch.paperjs.org/#V/0.12.7/S/nVdtb9s2EP4rrArUEqqoibcMqL1gQNpuK9BhRZJtH+J8oCXKVkOTBknnZUH++46vImUl2WYggXk83tvz3JF+yBjekGyWnV8TVa+zMqt5o9c3WKB1p37fqo4ziU7Qw4ItlCSrDWFKzpASO1IakRL8mkSCtqM0WipOicCsBpXjBXucg4y1O1Zru6gR+PZXcpfflqguESvACYKPcQ4+GblFX7FaV2dktaNYfOX0fsVZbuS8Yyo/OjwsEfwrSvRDiW7ROzQt5tbIupKEklqR5gOnXIC5iYJA5BYLSGHitOz/GnZr9OoE7VhD2o6RBv0EghlaZK/Je/K+bReZO8B0XENVZlQhE3y/EyroritdXX0gCHR1fDx1kDZY4WrdrdYU/pTL/BfBd9vclUQHue5oA7HP0OUGX5NTDhHIfA2p6+UHLhgR/fqiU5TA6qoMBixUxvsMTV7jKZ627aTfv+lkt6QAVIupJFb8WCSFEkTtBENrED4mSMYh8BJJD6WmjhyWS0K5juc91qsk4yLaqa1J2L8MYSJeLU3uleLbL6RV5fjWma7l2N6SAys3T520u+aw3b1y8bhYqpaLT7he5z733G6UqCtQj9YYiWuF2QpQibSMYeAjAUicnXRTdn8DIrIXBkT0Z1XhpvmgiQFQzweQObBWo2A5+nAPlFN+PlrhhbNQr8jnvhNLQuADgwb3np5stsmS4vp6EsHvW8E0+wW5U3EwoZWgclHRag7VZGo23qXctGSkbpvir65R6xk6HFRQeVJYiCAankrSSqu9ItgR9FmRTV9pCFDCUKwoX+WL7NxoIK2yyEoXn/fPwwwD13qkBnk6MSrXui9oLUXHVhf8ZwElyvcRqynB4tw5zH24W8G/gSREoiMdaQKu+f+QwBBl+QeTz+X5Qk5mHg3Z7ePC4P+GfMH3RMTV8mcGpOQ3wPw7EhFf82ypRQbdQQx+5l4eXYXvzr85c3l4VW257Izxk73JlKgePalqhk2iOx3X7SdXov3dc9re+H4hXHfGhVDPFmF69R/6IvWHm287qYZDp2tz500qrADqE7hGITSg6SKL2bQXU5KvX3iKIALYo+eOh5QAPxt4lENEypgv3rpLzcx3cncEB/0zZgoPEdCKqa81jPMSha99HMXcW3IvqxJtYfjOrUw717M4YrPBiHPq5uIFfM2tES2tNh372EEp4bkFGkeH/Q5nv/GdJB/5rS5Z6FpyA06L5HEH21vrlO0o1RaUewyeEbmjZt+1HsguiFTWCqDQ6QT6V6MJTHUtyl+F04VxZQZEOm2M7kLZSWoWj/Z03nt+86YPo1L3W0cYfRFYuljLLvxetYOhE5tEL9t0xQCzaGh3dCACkVwGfRl7u07mNCAnW7ENb7q2028KfWkJTm0OvbekNyAqweGraQ5nqqf6s8cIvCLiY6liaAAj8n1MOSN5PKAH1mtMySmW2kOEPzpIrfhpYIIdvx2CzaLHKKL+PjoTDfgkkMvr+uKNXQz9KykhhWfdWNH8GAqwhptca/uT6TX3mXUKfboxxCmHUIT0HvfbUuDVeFuOFatMp8WeC10Uz0Kg915yKSUKzx57EcZUiNgR8cCMK41+inwld0v4gVWrPMG+qChhK0Dy3Rh53ObAuqJ/Ev1KTC/TJx1sAM5uS+9zY7YYGFuKxFh0Kf5PgzB4T32Z9BDuX8o27rcoMVe6CAbiYu5t9tajzrG2T4e1T67RnoduDMBgeRH3MEGiwWZ+afmbfLR9k4ICbrak7syBowHFUpmX+rBg/HZUfzuiawqpkzdnKrs88D7tOjoCGVuVH9Fh/F4I1TT5kvzg++MYxv0XwvDAQP/fI4CM8Mn6h8eN7zqjFV4zb31LNYQq7GbMUy71JMnKbCkIvja1lNns8urxHw==
//     }
// };

setTraces.oninput = function() {
    // rerender the traces
    userLayer.clear();
    showTraceHistoryFrom(timeKeeper.value);
};

timeKeeper.oninput = function() {
    if (this.value === 0) return; // 0 is pre-generation state
    historyIndex = this.value;
    userLayer.clear();
    if (showTraces) {
        showTraceHistoryFrom(historyIndex);
    } else {
        let svg = historyHolder[historyIndex].svg;
        parseFromSvg(svg);
    }
};

prompt.addEventListener("input", (e) => {
    if (prompt.value === lastPrompt) {
        drawButton.innerHTML = "Redraw";
    } else {
        drawButton.innerHTML = "Draw";
    }
});

palette.addEventListener("click", () => {
    toggleArtControls();
});
const picker = new Picker({
    parent: document.getElementById("color-picker"),
    popup: false,
    alpha: true,
    defaultColor: "#0cf",
    editor: false,
    editorFormat: "hex", // or 'rgb', 'hsl'
});

picker.setColor(strokeColor);
picker.onChange = (color) => {
    strokeColor = color.rgbaString;
};

moveSelecterTo(document.querySelectorAll(".pen-mode")[2]);