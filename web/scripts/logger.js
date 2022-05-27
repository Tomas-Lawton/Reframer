class UserData {
    constructor() {
        self.uuid = "id" + Math.random().toString(16).slice(2);
        self.events = 0;
        self.eventLog = [];
    }
    logUserEvent() {
        console.log("hello world");
        self.eventLog.push("idek");
    }
    saveLogs() {
        dumpUserEvents({
            user_id: self.uuid,
            log_time: Date.now(), //can use this just have to update backend
            recorded_data: {
                events: eventLog,
                events: self.events,
            },
        });
        self.events += 1;
    }
}