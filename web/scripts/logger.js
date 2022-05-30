class UserData {
    constructor() {
        self.uuid = "id" + Math.random().toString(16).slice(2);
        self.events = 0;
        self.eventLog = [];
    }
    event(eventType) {
        dumpUserEvents({
            log_time: Date.now(), //can use this just have to update backend
            recorded_data: {
                user_id: self.uuid,
                event_type: eventType,
                event_count: self.events,
                data: mainSketch,
            },
        });
        self.events += 1;
    }
}

logger = new UserData();