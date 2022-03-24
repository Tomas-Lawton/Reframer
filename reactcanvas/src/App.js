import { useEffect, useRef, useState } from "react";
import { SketchRNN } from "@magenta/sketch";
import "./App.css";
import data from "./data/cat.gen.json";
import p5Min from "p5";
//how are paths represented and sent to back end svg vs html canvas
//integration with sketch-rnn
//integration with excalidraw code

function App() {
  const contextRef = useRef(null); //persists with rerender
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [rnnState, setRnnState] = useState();

  const [modelData, setModelData] = useState();
  const model = new SketchRNN(data);

  useEffect(() => {
    const canvas = canvasRef.current;
    // for high density screens
    canvas.width = window.innerWidth * 2;
    canvas.height = window.innerHeight * 2;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const context = canvas.getContext("2d");
    context.scale(2, 2);
    context.lineCap = "round";
    context.strokeStyle = "black";
    context.lineWidth = 5;
    contextRef.current = context;

    setRnnState(model.zeroState());
  }, []);

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const finishDrawing = () => {
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  };

  return (
    <canvas
      onMouseDown={startDrawing}
      onMouseUp={finishDrawing}
      onMouseMove={draw}
      ref={canvasRef}
    />
  );
}

export default App;
