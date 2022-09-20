const spark = new PaperScope();
spark.setup(sparkCanvas);
spark.activate();

var rect = new Rectangle();
rect.left = 100;
rect.right = 200;
rect.bottom = 400;
rect.top = 200;

let knob = new Path.Circle({
    radius: 5,
    fillColor: "#7B66FF",
    strokeColor: "white",
    strokeWidth: 3,
    position: { x: spark.view.bounds.right, y: spark.view.bounds.centerY },
});

let lossLine = new Path({
    position: { x: spark.view.bounds.right, y: spark.view.bounds.centerY },
});

var myPath = new Path({
    strokeColor: "#7B66FF",
    strokeWidth: 3,
    // fillColor: "#7B66FF",
});

myPath.strokeColor = "black";

myPath.add(new Point(spark.view.bounds.right, spark.view.bounds.centerY));

const easing = 0.98;

spark.view.onFrame = () => {
    if (mainSketch.semanticLoss) {
        let target = myPath.lastSegment.point.y; //ease?
        let newY = scaleRange(mainSketch.semanticLoss, -1, 0, 0, 150);
        let dy = target - newY;
        newY += dy * easing;

        let nextPoint = new Point(spark.view.bounds.right, newY);
        myPath.add(nextPoint);

        sparkKnob.style.top = newY + "px";
        knob.position.x -= 0.3;
        myPath.position.x -= 0.3;
    }
    scope.activate();
};