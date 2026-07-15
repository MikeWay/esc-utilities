
export class DefectType {
    id: number;
    name: string;
    description?: string;

    constructor(id: number, name: string, description: string) {
        this.id = id;
        this.name = name;
        this.description = description;
    }
}

export class DefectsForBoat {
    reportedDefects: ReportedDefect[];
    boatId: string;
     originallyReported: number = Date.now(); // Optional timestamp for when the defects were recorded
     timestamp: number = Date.now(); // Optional timestamp for when the defects were recorded

    constructor(reportedDefects: ReportedDefect[], boatId: string, originallyReported?: number, timestamp?: number) {
        this.reportedDefects = reportedDefects;
        this.boatId = boatId;   // link to the boat with these defects
        this.originallyReported = originallyReported || Date.now(); // Set the timestamp to the current time
        this.timestamp = timestamp || Date.now();
    }

    public clearDefect(reportedDefectId: string): void {
        const reportedDefectIdNum = Number(reportedDefectId);
        this.reportedDefects = this.reportedDefects.filter(defect => defect.defectId !== reportedDefectIdNum);
    }

    public hasDefects(): boolean {
        return this.reportedDefects.length > 0;
    }

    // helpers for saving to DynamoDB
    public toItem(): { reportedDefects: ReportedDefect[], boatId: string, originallyReported: number, timestamp: number } {
        return {
            reportedDefects: this.reportedDefects,
            boatId: this.boatId,
            originallyReported: this.originallyReported,
            timestamp: this.timestamp // when this record was last updated        
        };
    }


    // helper for creating from DynamoDB item
    public static fromItem(item: { reportedDefects: ReportedDefect[], boatId: string, timestamp: number, originallyReported: number }): DefectsForBoat {
        return new DefectsForBoat(
            item.reportedDefects,
            item.boatId,
            item.originallyReported,
            item.timestamp
        );
    }
}

/**
 * Defects need to have a first reported value and (maybe) a record of when they were cleared
 */
export class ReportedDefect {
    defectId: number;
    defectType: DefectType;
    additionalInfo?: string;
    dateReported: number;

    constructor(defectType: DefectType, dateReported: number, additionalInfo?: string) {
        this.defectType = defectType;
        this.dateReported = dateReported;
        this.additionalInfo = additionalInfo;
        this.defectId = Math.floor(Math.random() * 1e9) + Date.now();
    }

}
