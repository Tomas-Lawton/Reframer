class UserData {
    constructor() {
        self.uuid = "id" + Math.random().toString(16).slice(2);
        self.events = 0;
        self.eventLog = [];
    }
    event(eventType) {
        console.log("Logging: ", eventType);
        // logEventAPI({
        //     log_time: Date.now(),
        //     user_id: self.uuid,
        //     recorded_data: {
        //         event_type: eventType,
        //         event_count: self.events,
        //         data: {
        //             prompt: mainSketch.prompt,
        //             svg: mainSketch.svg,
        //             sketch_size: mainSketch.frameSize,
        //             exemplar_size: 0,
        //             mode: mainSketch.penMode,
        //             iteration_step: mainSketch.step,
        //             region: mainSketch.drawRegion,
        //         },
        //     },
        // });
        self.events += 1;
    }
}
logger = new UserData();