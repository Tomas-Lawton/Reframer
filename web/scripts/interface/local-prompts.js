const createLocalPrompt = (
    b = null,
    x = canvas.width / 2,
    y = canvas.height / 2,
    w = 50,
    h = 50
) => {
    if (!b) return;
    const i = createUUID();

    const frameParent = new Path.Rectangle(b);
    frameParent.set(frameOptions);

    const [frameContainer, frameInput, frameClose, frameGrab, frameResize, col] =
    createFrame(x, y, w, h);
    const [tag, closeButton, text] = createFrameItem(col);

    frameInput.addEventListener("input", (e) => {
        text.innerHTML = e.target.value;
        mainSketch.localFrames[i].data.prompt = e.target.value;
        document.getElementById("prompt-info").style.display = "none";
    });

    frameInput.addEventListener("blur", (e) => {
        if (e.target.value === "") deleteFrame(i);
    });

    tag.addEventListener("click", (e) => {
        frameInput.focus();
        for (const key in mainSketch.localFrames) {
            let item = mainSketch.localFrames[key];
            item.tag.style.background = "";
            item.frame.style.opacity = 1;
        }
        frameContainer.style.opacity = 0.9;
        tag.style.background = "#413d60";
    });

    frameClose.addEventListener("click", (e) => {
        deleteFrame(i);
    });

    closeButton.addEventListener("click", (e) => {
        deleteFrame(i);
    });

    frameGrab.onmousedown = (e) => {
        controller.pause();
        ungroup();
        let items = mainSketch.sketchLayer.getItems({
            inside: frameParent.bounds,
        });
        createGroup(items);

        if (window.innerWidth > 700) {
            e = e || window.event;
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = () => {
                document.onmouseup = null;
                document.onmousemove = null;
                ungroup();
            };
            document.onmousemove = (e) => {
                elementDrag(e, frameContainer);
                frameParent.position.x += e.movementX;
                frameParent.position.y += e.movementY;

                mainSketch.localFrames[i].data.points = {
                    x0: frameParent.bounds.topLeft.x,
                    y0: frameParent.bounds.topLeft.y,
                    x1: frameParent.bounds.bottomRight.x,
                    y1: frameParent.bounds.bottomRight.y,
                };

                controller.transformGroup.position.x += e.movementX;
                controller.transformGroup.position.y += e.movementY;
            };
        }
    };

    frameInput.onmousedown = (e) => {
        if (window.innerWidth > 700) {
            e = e || window.event;
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = (e) => {
                elementDrag(e, frameContainer);
                frameParent.position.x += e.movementX;
                frameParent.position.y += e.movementY;

                mainSketch.localFrames[i].data.points = {
                    x0: frameParent.bounds.topLeft.x,
                    y0: frameParent.bounds.topLeft.y,
                    x1: frameParent.bounds.bottomRight.x,
                    y1: frameParent.bounds.bottomRight.y,
                };
            };
        }
    };

    frameResize.onmousedown = (e) => {
        if (window.innerWidth > 700) {
            e = e || window.event;
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = (e) => {
                // TODO update other rects to do this instead . didn't work?
                let x = frameParent.bounds.width;
                let y = frameParent.bounds.height;
                if (x + e.movementX > 75) {
                    frameParent.bounds.width += e.movementX;
                } else {
                    frameParent.bounds.width = 75;
                }

                if (y + e.movementY > 30) {
                    frameParent.bounds.height += e.movementY;
                } else {
                    frameParent.bounds.height = 30;
                }

                frameContainer.style.width = frameParent.bounds.width + "px";
                frameResize.style.top =
                    frameParent.bounds.height + frameContainer.clientHeight + "px";
                frameResize.style.left = frameParent.bounds.width + "px";

                mainSketch.localFrames[i].data.points = {
                    x0: frameParent.bounds.topLeft.x,
                    y0: frameParent.bounds.topLeft.y,
                    x1: frameParent.bounds.bottomRight.x,
                    y1: frameParent.bounds.bottomRight.y,
                };

                frameInput.focus();
            };
        }
    };

    mainSketch.localFrames[i] = {
        tag: tag,
        frame: frameContainer,
        paperFrame: frameParent,
        data: {
            prompt: "default",
            points: {
                x0: frameParent.bounds.topLeft.x,
                y0: frameParent.bounds.topLeft.y,
                x1: frameParent.bounds.bottomRight.x,
                y1: frameParent.bounds.bottomRight.y,
            },
        },
    };

    frameContainer.querySelector("input").focus();
};

const createFrame = (x, y, w, h) => {
    frameContainer = document.createElement("div");
    let frameInput = document.createElement("input");
    let frameClose = document.createElement("i");
    let frameGrab = document.createElement("i");
    let frameResize = document.createElement("div");

    frameContainer.classList.add("frame-parent");
    frameClose.classList.add("fa-solid", "fa-xmark");
    frameGrab.classList.add("fa-solid", "fa-hand-back-fist");
    frameInput.classList.add("frame-label-active");

    const frameCol = frameColors[Math.floor(Math.random() * frameColors.length)];
    frameInput.style.background = frameCol;
    frameClose.style.background = frameCol;
    frameGrab.style.background = frameCol;

    frameContainer.appendChild(frameInput);
    frameContainer.appendChild(frameGrab);
    frameContainer.appendChild(frameClose);
    frameContainer.appendChild(frameResize);
    sketchContainer.appendChild(frameContainer);

    frameContainer.style.top = y - frameContainer.clientHeight + "px";
    frameContainer.style.left = x + "px";
    frameContainer.style.width = w + 1 + "px";
    frameResize.style.top = h + frameContainer.clientHeight + "px";
    frameResize.style.left = w + "px";

    return [
        frameContainer,
        frameInput,
        frameClose,
        frameGrab,
        frameResize,
        frameCol,
    ];
};

const createFrameItem = (col = "blue") => {
    let tag = document.createElement("li");
    let c1 = document.createElement("div");
    let c2 = document.createElement("div");
    let text = document.createElement("p");
    let circle = document.createElement("div");
    let closeButton = document.createElement("i");

    circle.classList.add("list-circle");
    circle.style.background = col;
    closeButton.classList.add("fa-solid", "fa-xmark");

    c1.appendChild(circle);
    c1.appendChild(text);
    c2.appendChild(closeButton);
    tag.appendChild(c1);
    tag.appendChild(c2);
    localPrompts.querySelector("ul").appendChild(tag);

    return [tag, closeButton, text];
};

const deleteFrame = (i) => {
    let item = mainSketch.localFrames[i];
    item.tag.remove();
    item.frame.remove();
    item.paperFrame.remove();
    delete mainSketch.localFrames[i];
    if (Object.keys(mainSketch.localFrames).length === 0) {
        document.getElementById("prompt-info").style.display = "initial";
    }
};