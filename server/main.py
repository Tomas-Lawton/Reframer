from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import asyncio
from fastapi.middleware.cors import CORSMiddleware
import skimage
import numpy as np
import logging
from class_interface import Clip_Class
from plot_util import plot_cosines, plot_zero_shot_images, plot_image
from interface_handler import Interface
import asyncio

# check environment var
# add filename='logs.log'
logging.basicConfig(encoding='utf-8', level=logging.DEBUG, format=f'APP LOGGING: %(levelname)s %(name)s %(threadName)s : %(message)s')

app = FastAPI(title = "Clip Draw Backend")
origins = [
    "http://localhost",
    "http://localhost:8080",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clip_class = Clip_Class()
clip_class.create_clip_draw(False) #encode nouns or nah

@app.get("/classify_dataset")
def classify_dataset():
    """Requires at least one image for each class so an image is classifed"""
    clip_class.set_image_descriptions({
    "cat": "a facial photo of a tabby cat",
    "astronaut": "a portrait of an astronaut with the American flag",
    "rocket": "a rocket standing on a launchpad",
    # "page": "a page of text about segmentation",
    # "motorcycle_right": "a red motorcycle standing in a garage",
    # "camera": "a person looking at a camera on a tripod",
    # "horse": "a black-and-white silhouette of a horse", 
    # "coffee": "a cup of coffee on a saucer"
    })
    clip_class.prepare_images("data/local_images", True, False) # or skimage.data_dir
    image_features = clip_class.encode_image_tensors(np.stack(clip_class.images_rgb)) 
    text_features = clip_class.encode_text_classes(["This is " + desc for desc in clip_class.classes])
    clip_class.calc_cosine_similarities_for_text(text_features, image_features, False)
    plot_cosines(clip_class)
    return {"Hello": "World"}

@app.get("/classify_zero_shot_dataset")
def classify_zero_shot_dataset():
    """Classify as many images as you like. Optionally set the number of classes, or a list of nouns???"""
    clip_class.prepare_images("data/local_images", False, True) # or skimage.data_dir
    image_features = clip_class.encode_image_tensors(np.stack(clip_class.images_rgb)) 
    text_features = clip_class.encode_text_classes(["This is " + desc for desc in clip_class.classes])
    clip_class.calc_cosine_similarities_for_text(text_features, image_features, True)
    plot_zero_shot_images(clip_class)
    return {"Hello": "World"}

@app.get("/classify_zero_shot_image")
def read_item(target: str = "cat"):
    image_path = f"data/local_images/single_images/{target}.jpg"
    clip_class.prepare_single_image(image_path) # or skimage.data_dir
    image_features = clip_class.encode_image_tensors(np.stack(clip_class.images_rgb)) 
    text_features = clip_class.encode_text_classes(["This is " + desc for desc in clip_class.classes])
    clip_class.calc_cosine_similarities_for_text(text_features, image_features, True)
    plot_zero_shot_images(clip_class)
    return {"Hello": target}

@app.get("/classify_text/directory/{prompt}")
def classify_text_from_image(prompt: str):
    prompt = prompt.replace('-', ' ')
    clip_class.prepare_images(skimage.data_dir, False, False) # or skimage.data_dir
    text_features = clip_class.encode_text_classes([prompt])
    image_features = clip_class.encode_image_tensors(np.stack(clip_class.images_rgb)) 
    clip_class.calc_cosine_similarities_for_image(text_features, image_features, True)
    
    image_values = clip_class.similarity[0].tolist()
    top_index = np.argsort(image_values)[-1:][0]
    top_image = clip_class.unprocessed_images[top_index]
    plot_image(top_image)
    return {"Hello": "{prompt}"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    canvas_interface = Interface(websocket, clip_class)
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()

            def run_loop():
                canvas_interface.is_running = True #for loop to continue
                loop = asyncio.get_running_loop()
                loop.run_in_executor(None, lambda: asyncio.run(loop_optimisation()))

            async def loop_optimisation():
                while canvas_interface.is_running:
                    await canvas_interface.run()

            # refactor to sinlge update.
            if data["status"] == "draw":
                await canvas_interface.draw_update(data)
                run_loop()

            if data["status"] == "redraw":
                await canvas_interface.redraw_update(data)
                run_loop()

            if data["status"] == "continue":
                await canvas_interface.continue_update(data)
                run_loop()
            
            if data["status"] == "stop":
                await canvas_interface.stop()
                
    except WebSocketDisconnect:
        await canvas_interface.stop()
        logging.info("Client disconnected")  


# async def read_and_send_to_client(data, canvas):
#     if data["status"] == "start":
#         await canvas.update(data)
#         if not canvas.is_running:
#             canvas.is_running = True
#         await canvas.run()
#     if data["status"] == "stop":
#         await canvas.stop()

# @app.websocket("/ws")
# async def ws_endpoint(websocket: WebSocket):
#     await websocket.accept()
#     queue = asyncio.queues.Queue()
#     canvas = Interface(websocket, clip_class)

#     async def read_from_socket(websocket: WebSocket):
#         async for data in websocket.iter_json():
#             queue.put_nowait(data)

#     async def get_data_and_send():
#         data = await queue.get()
#         fetch_task = asyncio.create_task(read_and_send_to_client(data, canvas))
#         while True:
#             data = await queue.get()
#             if not fetch_task.done():
#                 fetch_task.cancel()
#             fetch_task = asyncio.create_task(read_and_send_to_client(data, canvas))

#     await asyncio.gather(read_from_socket(websocket), get_data_and_send())