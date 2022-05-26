multiTool.onMouseDown = function(event) {
    // refactor for multitouch
    switch (mainSketch.penMode) {
        case "select":
            path = null;
            let hitResult = paper.project.hitTest(event.point, {
                segments: true,
                stroke: true,
                fill: true,
                tolerance: 10,
            });

            // TO change to simple hit test
            let isInBounds = null;
            if (mainSketch.boundingBox) {
                isInBounds =
                    event.point.x > mainSketch.boundingBox.bounds.left &&
                    event.point.x < mainSketch.boundingBox.bounds.right &&
                    event.point.y > mainSketch.boundingBox.bounds.top &&
                    event.point.y < mainSketch.boundingBox.bounds.bottom;
            }

            // Deselect all and create select region
            if ((!hitResult && !isInBounds) || (!hitResult && isInBounds == null)) {
                unpackGroup();
                userLayer.getItems().forEach((path) => {
                    path.selected = false;
                });
                mainSketch.rotationGroup = null;
                if (mainSketch.boundingBox) {
                    hideSelectUI();
                }

                // // Select box
                // if (selectBox) {
                //     selectBox.remove();
                // }
                // if (mainSketch.selectBox) {
                //     mainSketch.selectBox = null;
                // }
                mainSketch.selectBox = new Rectangle(event.point);
            }

            if (hitResult) {
                if (selectBox) {
                    selectBox.remove();
                }
                if (mainSketch.selectBox) {
                    mainSketch.selectBox = null;
                }

                // got path
                if (mainSketch.boundingBox) {
                    hideSelectUI(); // draw a new one containing selection
                }
                unpackGroup();
                path = hitResult.item;
                path.selected = true; //fix so that this happens with no drag but with drag it won't toggle !path.selected
                let items = getSelectedPaths();
                fitToSelection(items, "moving");
                updateSelectUI();
                //can't group on input because group must already be set. so the rotation is set non-functionally to the group
                rotateSlider.value = 0;
                rotateNumber.value = 0;
                let rotationGroup = new Group({ children: items });
                rotationGroup.transformContent = false;
                mainSketch.rotationGroup = rotationGroup;
            }
            break;
        case "pen":
            myPath = new Path({
                strokeColor: mainSketch.strokeColor,
                strokeWidth: mainSketch.strokeWidth,
                opacity: mainSketch.opacity,
                strokeCap: "round",
                strokeJoin: "round",
            });
            myPath.add(event.point);
            myPath.add({
                ...event.point,
                x: event.point.x + 0.001,
            }); //make a segment on touch down (one point)
            break;
        case "lasso":
            mainSketch.drawRegion = new Rectangle(event.point);
            break;
    }
};

multiTool.onMouseDrag = function(event) {
    switch (mainSketch.penMode) {
        case "pen":
            myPath.add(event.point);
            myPath.smooth();
            break;
        case "select":
            if (mainSketch.boundingBox) {
                if (mainSketch.boundingBox.data.state === "moving") {
                    const selectedPaths = getSelectedPaths(); // all selected
                    selectedPaths.forEach((path) => {
                        path.position.x += event.delta.x;
                        path.position.y += event.delta.y;
                    });
                    mainSketch.boundingBox.position.x += event.delta.x;
                    mainSketch.boundingBox.position.y += event.delta.y;
                    updateSelectUI();
                }
            }
            // TO DO: Refactor the temporary boxes
            if (mainSketch.selectBox != undefined) {
                mainSketch.selectBox.width += event.delta.x;
                mainSketch.selectBox.height += event.delta.y;
                if (selectBox !== undefined) selectBox.remove(); // redraw //REFACTOR
                selectBox = new Path.Rectangle(mainSketch.selectBox);
                selectBox.set({
                    fillColor: "#e9e9ff",
                    opacity: 0.4,
                    selected: true,
                });
            }
            break;
        case "lasso":
            mainSketch.drawRegion.width += event.delta.x;
            mainSketch.drawRegion.height += event.delta.y;
            if (regionPath !== undefined) regionPath.remove(); // redraw //REFACTOR
            regionPath = new Path.Rectangle(mainSketch.drawRegion);
            regionPath.set({
                fillColor: "#e9e9ff",
                opacity: 0.4,
                selected: true,
            });
            // Start draw
            break;
    }
};
multiTool.onMouseUp = function() {
    mainSketch.svg = paper.project.exportSVG({
        asString: true,
    });
    switch (mainSketch.penMode) {
        case "select":
            if (selectBox) {
                let items = userLayer.getItems({ inside: selectBox.bounds });
                items.forEach((item) => (item.selected = true));
                items.pop();
                mainSketch.selectBox = remove();
                selectBox.remove();
                fitToSelection(items, "moving");
                updateSelectUI();
            }
            break;
        case "pen":
            myPath.simplify();
            // sendPaths();
            mainSketch.stack.undoStack.push({
                type: "draw-event",
                data: myPath,
            });
            break;
        case "lasso":
            mainSketch.resetHistory(); //reset since not continuing
            mainSketch.draw(true);
            mainSketch.clipDrawing = true;
            regionPath.remove();
            break;
    }
    if (mainSketch.boundingBox) {
        mainSketch.boundingBox.data.state = "moving";
    }
};

eraseTool.onMouseDown = function(event) {
    mainSketch.stack.undoStack.push({
        type: "erase-event",
        data: userLayer.exportJSON(),
    });
    erasorPath = new Path({
        strokeWidth: mainSketch.strokeWidth * 2,
        strokeCap: "round",
        strokeJoin: "round",
        // strokeColor: "white",
        // opacity: 0.9,
        strokeColor: "rgb(255, 0, 0)",
    });
    tmpGroup = new Group({
        children: userLayer.removeChildren(),
        blendMode: "source-out",
        insert: false,
    });
    mask = new Group({
        children: [erasorPath, tmpGroup],
        blendMode: "source-over",
    });
};

eraseTool.onMouseDrag = function(event) {
    erasorPath.add(event.point);
};

eraseTool.onMouseUp = function(event) {
    erasorPath.simplify();
    const eraseRadius = (mainSketch.strokeWidth * 2) / 2;
    const outerPath = OffsetUtils.offsetPath(erasorPath, eraseRadius);
    const innerPath = OffsetUtils.offsetPath(erasorPath, -eraseRadius);
    erasorPath.remove();
    outerPath.insert = false;
    innerPath.insert = false;
    innerPath.reverse();
    let deleteShape = new Path({
        closed: true,
        insert: false,
    });
    deleteShape.addSegments(outerPath.segments);
    deleteShape.addSegments(innerPath.segments);
    const endCaps = new CompoundPath({
        children: [
            new Path.Circle({
                center: erasorPath.firstSegment.point,
                radius: eraseRadius,
            }),
            new Path.Circle({
                center: erasorPath.lastSegment.point,
                radius: eraseRadius,
            }),
        ],
        insert: false,
    });
    deleteShape = deleteShape.unite(endCaps);
    deleteShape.simplify();
    console.log(tmpGroup.getItems((erasorItem) => console.log(erasorItem)));

    const erasorItems = tmpGroup.getItems({
        overlapping: deleteShape.bounds,
    });

    erasorItems.forEach(function(erasorItem) {
        const result = erasorItem.subtract(deleteShape, {
            trace: false,
            insert: false,
        });
        if (result.children) {
            erasorItem.parent.insertChildren(
                erasorItem.index,
                result.removeChildren()
            );
            erasorItem.remove();
        } else {
            if (result.length === 0) {
                erasorItem.remove();
            } else {
                erasorItem.replaceWith(result);
            }
        }
    });
    userLayer.addChildren(tmpGroup.removeChildren());
    mask.remove();

    mainSketch.svg = paper.project.exportSVG({
        asString: true,
    });
};