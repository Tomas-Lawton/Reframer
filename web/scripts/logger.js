class UserData {
    constructor() {
        self.uuid = "id" + Math.random().toString(16).slice(2);
        self.events = 0;
        self.eventLog = [];
    }
    event(eventType) {
        // console.log("Logging: ", eventType);
        // logEventAPI({
        //     log_time: Date.now(),
        //     user_id: self.uuid,
        //     recorded_data: {
        //         event_type: eventType,
        //         event_count: self.events,
        //         data: {
        //             prompt: sketchController.prompt,
        //             svg: sketchController.svg,
        //             sketch_size: sketchController.frameSize,
        //             exemplar_size: 0,
        //             mode: sketchController.penMode,
        //             iteration_step: sketchController.step,
        //             region: sketchController.drawRegion,
        //         },
        //     },
        // });
        self.events += 1;
    }
}
logger = new UserData();