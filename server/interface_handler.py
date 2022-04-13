import logging
import aiofiles
import asyncio


class Interface:
    def __init__(self, websocket, clip_instance):
        self.socket = websocket
        self.is_running = False
        self.clip_class = clip_instance
        logging.info("Interface connected")

    # draw
    async def draw_update(self, data):
        logging.info("Updating...")
        prompt = data["data"]["prompt"]
        svg_string = data["data"]["svg"]
        region = data["data"]["region"]
        async with aiofiles.open('data/interface_paths.svg', 'w') as f:
            await f.write(svg_string)
        try:
            self.clip_class.setup_draw([prompt], region)
        except:
            logging.error("Failed to start clip draw")

    async def redraw_update(self, data):
        logging.info("Updating...")
        try:
            self.clip_class.setup_redraw()
        except:
            logging.error("Failed to start clip draw")

    async def continue_update(self, data):
        logging.info("Updating...")
        prompt = data["data"]["prompt"]
        try:
            self.clip_class.setup_continue(prompt)
        except:
            logging.error("Failed to start clip draw")

    async def run(self):
        logging.info("Running iteration...")
        svg = ''
        i, loss = self.clip_class.clip_draw_optimiser.run_iteration()
        async with aiofiles.open("results/output.svg", "r") as f:
            svg = await f.read()
        await self.socket.send_json({"svg": svg, "iterations": i, "loss": loss})
        logging.info(f"Optimisation {i} complete")

    async def stop(self):
        logging.info("Stopping...")
        self.is_running = False

        # if self.clip_draw_optimiser.is_active:
        #     self.clip_draw_optimiser.stop_drawing()
