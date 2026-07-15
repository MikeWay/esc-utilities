import { Defect } from "./defect";

export interface LogEntryItem {
    logKey?: string;
    boatName?: string;
    personName?: string;
    checkOutDateTime?: number; // Use number for timestamps
    checkInDateTime?: number; // Use number for timestamps
    checkOutReason?: string;
    defect?: string; // Assuming defect is a string representation
}


export class LogEntry implements LogEntryItem{
    logKey: string; 
    boatName?: string;
    boatId?: string;
    personName?: string;
    checkOutDateTime?: number; // Use number for timestamps, or Date object
    checkOutDateTimeObj?: Date; // Optional Date object for convenience
    checkInDateTime?: number;   
    checkInDateTimeObj?: Date; // Optional Date object for convenience
    checkOutReason?: string;
    defect?: string;

    constructor(init: Partial<LogEntry>) {
        Object.assign(this, init);
        this.logKey = init.logKey ?? `${init.boatName}-${new Date().toISOString()}`;
        if (this.checkOutDateTime && typeof this.checkOutDateTime === 'string') {
            // Convert string to Date if necessary
            this.checkOutDateTimeObj = new Date(this.checkOutDateTime as unknown as string);
            this.checkOutDateTime = this.checkOutDateTimeObj.getTime(); // Store as timestamp
        }
        if (init.checkInDateTime && typeof init.checkInDateTime === 'string') {
            this.checkInDateTimeObj = new Date(init.checkInDateTime as unknown as string);
            this.checkInDateTime = this.checkInDateTimeObj.getTime(); // Store as timestamp
        }
    }

    // constructor(boatName: string, checkOutDateTime: Date, defect: Defect | null) {
    //     // Initialize the properties of the LogEntry
    //     this.logKey = `${boatName}-${new Date().toISOString()}`;
    //     this.boatName = boatName;
    //     this.checkOutDateTime = checkOutDateTime;
    //     this.defect = defect;
    // }

    public toItem(): {
        logKey: string;
        boatName: string;
        personName: string;
        checkOutDateTime?: number;
        checkInDateTime?: number;
        checkOutReason?: string;
        defect: string;
    } {
        return {
            logKey: this.logKey,
            boatName: this.boatName ?? "",
            personName: this.personName ?? "",
            checkOutDateTime: this.checkOutDateTime,
            checkInDateTime: this.checkInDateTime,
            checkOutReason: this.checkOutReason ? this.checkOutReason : "",
            defect: ""
        };
    }
    public toString(): string {
        return `LogEntry: Boat Name: ${this.boatName}, Person Name: ${this.personName}, 
        Check Out DateTime: ${this.checkOutDateTime}, Check In DateTime: ${this.checkInDateTime}, 
        Check Out Reason: ${this.checkOutReason}, Defect: ${this.defect ? this.defect : 'No Defect'}`;
    }

}