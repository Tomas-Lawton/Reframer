// If not a path and not in bounds

multiTool.onMouseDown = function(event) {
    // refactor for multitouch
    switch (penMode) {
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
            if (boundingBox) {
                console.log(event);
                console.log(boundingBox);
                isInBounds =
                    event.point.x > boundingBox.bounds.left &&
                    event.point.x < boundingBox.bounds.right &&
                    event.point.y > boundingBox.bounds.top &&
                    event.point.y < boundingBox.bounds.bottom;
            }

            if (!hitResult && !isInBounds) {
                // outside bound + no path
                userLayer.getItems().forEach((path) => {
                    console.log(path);
                    path.selected = false;
                });
                if (boundingBox) {
                    hideSelectUI();
                }
            }
            if (hitResult) {
                // got path
                if (boundingBox) {
                    hideSelectUI();
                }

                path = hitResult.item;
                path.selected = true; //fix so that this happens with no drag but with drag it won't toggle !path.selected

                let items = getSelectedPaths();
                let bbox = items.reduce((bbox, item) => {
                    return !bbox ? item.bounds : bbox.unite(item.bounds);
                }, null);
                // Add stroke width so no overflow over bounds?
                boundingBox = new Path.Rectangle(bbox);
                boundingBox.strokeColor = "black";
                boundingBox.data.state = "moving";
                updateSelectUI();
            }
            if (boundingBox) {
                if (
                    boundingBox.hitTest(event.point, {
                        segments: true,
                        tolerance: 3,
                    })
                ) {
                    // got rectangle segment
                    // find which segment point was hit
                    var i;
                    for (i = 0; i < boundingBox.segments.length; i++) {
                        var p = boundingBox.segments[i].point;
                        if (p.isClose(event.point, 3)) {
                            break;
                        }
                    }
                    var opposite = (i + 2) % 4;
                    boundingBox.data.from = boundingBox.segments[opposite].point;
                    boundingBox.data.to = boundingBox.segments[i].point;
                    boundingBox.data.state = "resizing";
                    boundingBox.data.corner = boundingBox.segments[i].point;
                }
            }
            break;
        case "pen":
            myPath = new Path({
                strokeColor: strokeColor,
                strokeWidth: strokeWidth,
                opacity: opacity,
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
            drawRegion = new Rectangle(event.point);
            break;
    }
};

multiTool.onMouseDrag = function(event) {
    switch (penMode) {
        case "pen":
            myPath.add(event.point);
            myPath.smooth();
            break;
        case "select":
            if (boundingBox) {
                if (boundingBox.data.state === "moving") {
                    const selectedPaths = getSelectedPaths(); // all selected
                    selectedPaths.forEach((path) => {
                        path.position.x += event.delta.x;
                        path.position.y += event.delta.y;
                    });
                    boundingBox.position.x += event.delta.x;
                    boundingBox.position.y += event.delta.y;

                    updateSelectUI();
                } else if (boundingBox.data.state === "resizing") {
                    // Enforce 1:1 rect only
                    boundingBox.bounds = new Rectangle(
                        boundingBox.data.from,
                        event.point
                    );
                    boundingBox.strokeColor = "black";
                    boundingBox.data.state = "resizing";

                    const selectedPaths = getSelectedPaths(); // all selected
                    let boundedSelection = new Group({ children: selectedPaths });
                    boundedSelection.scale(
                        event.delta.length / 5.5,
                        boundingBox.data.from
                    );
                    // UNGROUP

                    updateSelectUI();
                } else if (boundingBox.data.state === "rotating") {
                    // rotate by difference of angles, relative to center, of
                    // the last two points.
                    var center = boundingBox.center;
                    var baseVec = center - e.lastPoint;
                    var nowVec = center - e.point;
                    var angle = nowVec.angle - baseVec.angle;
                    boundingBox.rotate(angle);
                    // adjustRect(rect);
                    updateSelectUI();
                }
            }
            break;
        case "lasso":
            drawRegion.width += event.delta.x;
            drawRegion.height += event.delta.y;
            if (regionPath !== undefined) regionPath.remove(); // redraw
            regionPath = new Path.Rectangle(drawRegion);
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
    switch (penMode) {
        case "pen":
            myPath.simplify();
            // sendPaths();
            undoStack.push({
                type: "draw-event",
                data: myPath,
            });
            break;
        case "lasso":
            resetHistory(); //reset since not continuing
            startDrawing(prompt.value === lastPrompt ? "redraw" : "draw", true);
            clipDrawing = true;
            break;
    }
};

eraseTool.onMouseDown = function(event) {
    erasorPath = new Path({
        strokeWidth: strokeWidth * 2,
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
    const eraseRadius = (strokeWidth * 2) / 2;
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
};