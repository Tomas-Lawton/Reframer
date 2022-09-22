const spark = new PaperScope();
spark.setup(sparkCanvas);
spark.activate();

sparkCanvas.style.width =
    document.querySelector(".panel-section").clientWidth + "px";
sparkCanvas.style.height = 150 + "px";
// sparkCanvas.width = document.querySelector(".panel-section").clientWidth;
// sparkCanvas.height = 150;

const easing = 0.98;
const speed = 0.6;
let renderShape, pointA, pointB, sparkPath;

const createSparkShadow = () => {
    if (renderShape) renderShape.remove();
    renderShape = sparkPath.clone();
    renderShape.firstSegment.point.x -= 1.5;

    let bottomLeftPoint = new Point(
        sparkPath.firstSegment.point.x - 1.5,
        spark.view.bounds.bottom
    );
    let bottomRightPoint = new Point(
        spark.view.bounds.right,
        spark.view.bounds.bottom
    );
    let bl = renderShape.insert(0, bottomLeftPoint);
    let br = renderShape.add(bottomRightPoint);
    new Path.Line({ from: bl, to: br }); //connect
    renderShape.set({
        fillColor: {
            gradient: {
                stops: ["#CAA9FF", "#f7f6ff"],
            },
            origin: spark.view.bounds.topCenter,
            destination: spark.view.bounds.bottomCenter,
        },
        strokeColor: null,
    });

    renderShape.sendToBack();
};

const setup = () => {
    if (sparkPath) sparkPath.remove();

    pointA = new Point(0, spark.view.bounds.centerY);
    pointB = new Point(spark.view.bounds.right, spark.view.bounds.centerY);
    sparkPath = new Path({
        strokeColor: "#7B66FF",
        strokeWidth: 3,
        strokeCap: "round",
    });
    sparkPath.add(pointA);
    sparkPath.add(pointB);
    createSparkShadow();
};

setup();

spark.view.onFrame = () => {
    if (
        (controller.drawState === "draw" || controller.drawState === "draw") &&
        mainSketch.semanticLoss
    ) {
        let newY = scaleRange(mainSketch.semanticLoss, -1, 0, 0, 150);
        let dy = sparkPath.lastSegment.point.y - newY;
        newY += dy * easing;
        sparkPath.position.x -= speed;
        sparkKnob.style.top = newY + "px";

        sparkPath.add(new Point(spark.view.bounds.right, newY));
        createSparkShadow();
    }
    mainScope.activate(); //return to main
};