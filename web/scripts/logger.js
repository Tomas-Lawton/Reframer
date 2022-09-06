class UserData {
    constructor() {
        this.uuid = "id" + Math.random().toString(16).slice(2);
        this.events = 0;
        this.eventLog = [];
        this.userName = "";
    }
    event(eventType) {
        if (
            useAI ||
            (!useAI && eventType === "save-sketch") ||
            eventType === "clear-sketch" ||
            eventType === "begin-pilot"
        ) {
            console.log("Logging: ", eventType, "\n at ", new Date().toISOString());
            // logEventAPI({
            //     log_time: new Date(),
            //     user_id: this.uuid,
            //     recorded_data: {
            //         user_name: this.userName,
            //         event_type: eventType,
            //         event_count: this.events,
            //         data: {
            //             prompt: controller.prompt,
            //             svg: mainSketch.svg,
            //             sketch_size: controller.frameSize,
            //             mode: controller.penMode,
            //             last_iteration: controller.lastIteration,
            //             draw_step: controller.step,
            //             region: controller.drawRegion,
            //         },
            //     },
            // });
            this.events += 1;
        }
    }
}
logger = new UserData();