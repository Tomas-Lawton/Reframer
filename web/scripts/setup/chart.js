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
// myPath.add(spark.view.bounds.bottomLeft);
// for (var i = 1; i < points; i++) {
//     var point = new Point(width / points * i, center.y);
//     path.add(point);
// }
// myPath.add(spark.view.bounds.bottomRight);

myPath.add(new Point(spark.view.bounds.right, spark.view.bounds.centerY));

let easing = 0.98;

spark.view.onFrame = () => {
    if (mainSketch.semanticLoss) {
        let target = myPath.lastSegment.point.y; //ease?
        let newY = scaleRange(mainSketch.semanticLoss, -1, 0, 0, 150);
        let dy = target - newY;
        newY += dy * easing;

        let nextPoint = new Point(spark.view.bounds.right, newY);
        myPath.add(nextPoint);

        sparkKnob.style.top = newY + "px";

        // let newY = new Point(spark.view.bounds.right, last + (rando < 0.5 ? 3 : -3));
        knob.position.x -= 0.3;
        myPath.position.x -= 0.3;
    }
    scope.activate();
};

// const ctx = sparkCanvas.getContext("2d");
// const myChart = new Chart(ctx, {
//     type: "line",
//     data: {
//         labels: ["Red", "Blue", "Yellow", "Green", "Purple", "Orange"],
//         datasets: [{
//             label: null,
//             data: [12, 19, 3, 5, 2, 3],
//             backgroundColor: [
//                 "rgba(255, 99, 132, 0.2)",
//                 "rgba(54, 162, 235, 0.2)",
//                 "rgba(255, 206, 86, 0.2)",
//                 "rgba(75, 192, 192, 0.2)",
//                 "rgba(153, 102, 255, 0.2)",
//                 "rgba(255, 159, 64, 0.2)",
//             ],
//             borderColor: [
//                 "rgba(255, 99, 132, 1)",
//                 "rgba(54, 162, 235, 1)",
//                 "rgba(255, 206, 86, 1)",
//                 "rgba(75, 192, 192, 1)",
//                 "rgba(153, 102, 255, 1)",
//                 "rgba(255, 159, 64, 1)",
//             ],
//         }, ],
//     },
//     options: {
//         tension: 0.4,
//     },
// });

// scope.activate();