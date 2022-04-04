from importlib.resources import contents
from fastapi import FastAPI, Request, WebSocket, BackgroundTasks
import asyncio
import threading
from fastapi.middleware.cors import CORSMiddleware
import skimage
import numpy as np
import logging
from class_interface import Clip_Class
from plot_util import plot_cosines, plot_zero_shot_images, plot_image
import aiofiles
from fastapi.concurrency import run_in_threadpool

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

@app.get("/activate_clip_draw/")
def activate_clip_draw():
    prompts = ['A drawing of a red chair.']
    neg_prompts = ['A badly drawn sketch.', 'Many ugly, messy drawings.']
    clip_class.start_clip_draw(prompts, False, neg_prompts);
    return {"Hello": "World"}

@app.get("/get_latest_paths")
async def get_latest_paths():
    svg_string = ""
    with open("results/latest_rendered_paths.svg") as f:
        svg_string = f.read()
        logging.info(svg_string)

    iteration = 0
    if (hasattr(clip_class.clip_draw_optimiser, 'iteration')):
        iteration = clip_class.clip_draw_optimiser.iteration
    loss = 1
    if (hasattr(clip_class.clip_draw_optimiser, 'loss')):
        loss = clip_class.clip_draw_optimiser.loss
    return {
        "svg": svg_string,
        "iterations": iteration,
        "loss": loss
    }



    #     await websocket.send_text({
    #             "svg": svg_string,
    #             "iterations": iteration,
    #             "loss": loss
    #     })

def read_svg_file():
    with open("results/latest_rendered_paths.svg") as f:
        return f.read()

# @app.websocket("/ws")
# async def read_webscoket(websocket: WebSocket) -> None:
#     await websocket.accept()
#     data = await websocket.receive_text()
#     svg_string = ""
#     draw_step = 1
#     # asyncio.create_task(read_from_socket(websocket))
#     # split into an async task
#     # handle return to websocket

#     # make the actual optim loop async so we can still recieve the websocket. Then set the is_active to false. 
#     current_iteration = 0
#     while True:
#         # if not clip_class.clip_draw_optimiser.is_active:
#         if current_iteration > 10:
#             break
#         else:
#             current_iteration = clip_class.clip_draw_optimiser.run_iteration()
#             if current_iteration % draw_step == 0:
#                 svg_string = read_svg_file()
#                 # logging.info(f"Sending svg: {svg_string}")
#             await websocket.send_text(svg_string)
#         logging.info(f"Optimisation {current_iteration} complete")
#         logging.info(data)
#     logging.info("Done")
#         # await asyncio.sleep(.5)


@app.websocket("/ws")
async def read_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    while True:
        data = await websocket.receive_json()

        def get_step_data():
            i = clip_class.clip_draw_optimiser.run_iteration()
            svg = read_svg_file()
            logging.info(f"Optimisation {i} complete")    
            return svg

        # async
        def run_continuous_iterations():
            while True:
                svg_string = get_step_data()
                websocket.send_text(svg_string) 

        if data["status"] == "update":
            prompt = data["data"]["prompt"]
            svg_string = data["data"]["svg"]
            async with aiofiles.open('data/interface_paths.svg', 'w') as f:
                await f.write(svg_string)  # async read
            logging.info(f"Setting clip prompt: {prompt}")        
            try:
                clip_class.start_clip_draw([prompt], False) # optional args
            except:
                logging.error("Failed to start clip draw")
            logging.info("Clip drawer initialised")
        
        if data["status"] == "start":
            # svg_string = get_step_data()
            # await websocket.send_text(svg_string)
            await run_in_threadpool(run_continuous_iterations)
            # await run_continuous_iterations()

        if data["status"] == "stop":
            is_running = False
            print("Stopping process")


# @app.post("/update_prompt")
# async def update_prompt(request: Request, background_tasks: BackgroundTasks):
#     request_data = await request.json()
#     prompt = request_data["prompt"]
#     svg_string = request_data["svg"]
#     async with aiofiles.open('data/interface_paths.svg', 'w') as f:
#         await f.write(svg_string)  # async read
#     logging.info(f"Setting clip prompt: {prompt}")        
#     try:
#         clip_class.start_clip_draw([prompt], False) # optional args
#     except:
#         logging.error("Failed to start clip draw")
#     logging.info("Clip drawer initialised")
#     # put in new thread in stead so it can be killed when the end point is hit.
#     # background_tasks.add_task(start_clip_draw_background)
#     return {
#         "data" : request_data
#     }

