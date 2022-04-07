import logging
import aiofiles
import asyncio

class Interface():
    def __init__(self, websocket, clip_instance):
        self.socket = websocket
        self.is_running = False
        self.clip_class = clip_instance
        logging.info("Interface connected")

    async def get_step_data(self):
        i, loss = self.clip_class.clip_draw_optimiser.run_iteration()
        async with aiofiles.open("results/output.svg", "r") as f:
            svg = await f.read()
            return i, svg, loss
    
    async def update(self, data):
        logging.info("Updating...")
        prompt = data["data"]["prompt"]
        svg_string = data["data"]["svg"]
        async with aiofiles.open('data/interface_paths.svg', 'w') as f:
            await f.write(svg_string)
        try:
            self.clip_class.start_clip_draw([prompt]) # use canvas svg?
        except:
            logging.error("Failed to start clip draw")
    
    async def run(self):
        logging.info("Starting collab...")
        # while self.is_running:
            # check iteration greater than maximum and loss value
        logging.info("Running iteration...")
        i, svg, loss = await self.get_step_data()
        await self.socket.send_json({
            "svg": svg,
            "iterations": i,
            "loss": loss
        }) 
        logging.info(f"Optimisation {i} complete")    
        # await asyncio.sleep(0.01) don't use since using executer now
    
    async def stop(self):
        logging.info("Stopping...")
        self.is_running = False

        # if self.clip_draw_optimiser.is_active:
        #     self.clip_draw_optimiser.stop_drawing()