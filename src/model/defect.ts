// Class reresenting a defect. References a DefectType and Additional Information
export class Defect {
    defectType: DefectType;
    additionalInfo?: string;
    dateReported?: Date;
    reportBy?: string;
    // Constructor to initialize the defect with boat name, description, date reported, and reporter's name
    constructor(defectType: DefectType, additionalInfo?: string, dateReported?: Date, reportBy?: string) {
        this.defectType = defectType;
        this.additionalInfo = additionalInfo;
        this.dateReported = dateReported;
        this.reportBy = reportBy;
    }
}

export class DefectType {
    id: number;
    name: string;
    description: string;

    constructor(id: number, name: string, description: string) {
        this.id = id;
        this.name = name;
        this.description = description;
    }
}
