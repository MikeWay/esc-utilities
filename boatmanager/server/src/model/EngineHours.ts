export class EngineHours {
    boatId: string;
    timestamp: number;
    hours: number;
    reason: string;

    constructor(boatId: string, hours: number, reason: string) {
        this.boatId = boatId;
        this.hours = hours;
        this.reason = reason;
        this.timestamp = Date.now();
    }
    toItem() {
        return {
            boatId: this.boatId,
            hours: this.hours,
            reason: this.reason,
            timestamp: this.timestamp
        };
    }

    static fromItem(item: { boatId: string; hours: number; reason: string; timestamp: number }): EngineHours {
        const engineHours = new EngineHours(item.boatId, item.hours, item.reason);
        engineHours.timestamp = item.timestamp;
        return engineHours;
    }
}