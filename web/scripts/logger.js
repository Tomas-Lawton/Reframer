class UserData {
    constructor() {
        self.uuid = "id" + Math.random().toString(16).slice(2);
        self.events = 0;
        self.eventLog = [];
        self.userName = "";
    }
    event(eventType) {
        if (
            useAI ||
            (!useAI && eventType === "save-sketch") ||
            eventType === "clear-sketch"
        ) {
            console.log("Logging: ", eventType, "\n at ", new Date().toISOString());
            logEventAPI({
                log_time: new Date(),
                user_id: self.uuid,
                recorded_data: {
                    user_name: self.userName,
                    event_type: eventType,
                    event_count: self.events,
                    data: {
                        prompt: controller.prompt,
                        svg: mainSketch.svg,
                        sketch_size: controller.frameSize,
                        mode: controller.penMode,
                        last_iteration: controller.lastIteration,
                        draw_step: controller.step,
                        region: controller.drawRegion,
                    },
                },
            });
            self.events += 1;
        }
    }
}
logger = new UserData();