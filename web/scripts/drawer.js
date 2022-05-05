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
            let isInBounds = true;
            if (mainSketch.boundingBox) {
                isInBounds =
                    event.point.x > mainSketch.boundingBox.bounds.left &&
                    event.point.x < mainSketch.boundingBox.bounds.right &&
                    event.point.y > mainSketch.boundingBox.bounds.top &&
                    event.point.y < mainSketch.boundingBox.bounds.bottom;
            }

            if (!hitResult && !isInBounds) {
                // outside bound + no path
                userLayer.getItems().forEach((path) => {
                    console.log(path);
                    path.selected = false;
                });
                if (mainSketch.boundingBox) {
                    hideSelectUI();
                }
            }
            if (hitResult) {
                // got path
                if (mainSketch.boundingBox) {
                    hideSelectUI();
                }

                path = hitResult.item;
                path.selected = true; //fix so that this happens with no drag but with drag it won't toggle !path.selected

                let items = getSelectedPaths();
                let bbox = items.reduce((bbox, item) => {
                    return !bbox ? item.bounds : bbox.unite(item.bounds);
                }, null);
                // Add stroke width so no overflow over bounds?
                mainSketch.boundingBox = new Path.Rectangle(bbox);
                mainSketch.boundingBox.strokeColor = "#D2D2D2";
                mainSketch.boundingBox.strokeWidth = 2;
                mainSketch.boundingBox.data.state = "moving";
                updateSelectUI();
            }
            if (mainSketch.boundingBox) {
                if (
                    mainSketch.boundingBox.hitTest(event.point, {
                        segments: true,
                        tolerance: 3,
                    })
                ) {
                    // got rectangle segment
                    // find which segment point was hit
                    var i;
                    for (i = 0; i < mainSketch.boundingBox.segments.length; i++) {
                        var p = mainSketch.boundingBox.segments[i].point;
                        if (p.isClose(event.point, 3)) {
                            break;
                        }
                    }
                    var opposite = (i + 2) % 4;
                    mainSketch.boundingBox.data.from =
                        mainSketch.boundingBox.segments[opposite].point;
                    mainSketch.boundingBox.data.to =
                        mainSketch.boundingBox.segments[i].point;
                    mainSketch.boundingBox.data.state = "resizing";
                    mainSketch.boundingBox.data.corner =
                        mainSketch.boundingBox.segments[i].point;
                }
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
                } else if (mainSketch.boundingBox.data.state === "resizing") {
                    // Enforce 1:1 rect only
                    mainSketch.boundingBox.bounds = new Rectangle(
                        mainSketch.boundingBox.data.from,
                        event.point
                    );
                    mainSketch.boundingBox.strokeColor = "#D2D2D2";
                    mainSketch.boundingBox.strokeWidth = 2;
                    mainSketch.boundingBox.data.state = "resizing";

                    const selectedPaths = getSelectedPaths(); // all selected
                    let boundedSelection = new Group({ children: selectedPaths });
                    boundedSelection.scale(
                        event.delta.length / 5.5,
                        mainSketch.boundingBox.data.from
                    );
                    // UNGROUP

                    updateSelectUI();
                } else if (mainSketch.boundingBox.data.state === "rotating") {
                    // rotate by difference of angles, relative to center, of
                    // the last two points.
                    var center = mainSketch.boundingBox.center;
                    var baseVec = center - e.lastPoint;
                    var nowVec = center - e.point;
                    var angle = nowVec.angle - baseVec.angle;
                    mainSketch.boundingBox.rotate(angle);
                    // adjustRect(rect);
                    updateSelectUI();
                }
            }
            break;
        case "lasso":
            mainSketch.drawRegion.width += event.delta.x;
            mainSketch.drawRegion.height += event.delta.y;
            if (regionPath !== undefined) regionPath.remove(); // redraw
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
multiTool.onMouseUp = function(event) {
    mainSketch.svg = paper.project.exportSVG({
        asString: true,
    });

    switch (mainSketch.penMode) {
        case "pen":
            myPath.simplify();
            // sendPaths();
            mainSketch.stack.undoStack.push({
                type: "draw-event",
                data: myPath,
            });
            break;
        case "lasso":
            resetHistory(); //reset since not continuing
            startDrawing(
                prompt.value === mainSketch.lastPrompt ? "redraw" : "draw",
                true
            );
            mainSketch.mainSketch.clipDrawing = true;
            break;
    }
};

eraseTool.onMouseDown = function(event) {
    erasorPath = new Path({
        strokeWidth: mainSketch.strokeWidth * 2,
        strokeCap: "round",
        strokeJoin: "round",
        strokeColor: "white",
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