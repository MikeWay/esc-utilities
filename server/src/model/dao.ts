import { Boat } from "./Boat";
import { BoatManager } from "./BoatManager";
import { DefectsForBoat, DefectType, ReportedDefect } from "./defect";
import { LogEntry } from "./log";
import { LogManager, logManager } from "./LogManager";
import { Person } from "./Person";
import { PersonManager } from "./PersonManager"; // Adjusted the path to the correct location
import { DefectManager } from "./DefectManager";
import { AdminPersonManager } from "./AdminPersonManager";
import { EngineHoursManager } from "./EngineHoursManager";
import { EngineHours } from "./EngineHours";

export class DataAccessObject {

    public boatManager: BoatManager;
    public personManager: PersonManager;
    public logManager: LogManager; // Placeholder for LogManager, adjust as needed
    public defectManager: DefectManager;
    public adminPersonManager: AdminPersonManager; // Placeholder for admin person manager, adjust as needed
    public engineHoursManager: any; // Placeholder for EngineHoursManager, implement as needed
    // Store JWT tokens for admin users by their id
    public tokenStore: Map<string, string> = new Map();

    constructor() {
        // Initialize the boat manager and person manager
        this.boatManager = new BoatManager();
        this.personManager = new PersonManager();
        this.logManager = new LogManager();
        this.defectManager = new DefectManager();
        this.adminPersonManager = new AdminPersonManager();
        this.engineHoursManager = new EngineHoursManager();
        //this.initialize();
    }
    


    public async checkInBoat(boat: Boat, checkInByUser: Person, defects: ReportedDefect[], engineHours?: number, reason?: string): Promise<ReportedDefect[]>    {
        if (!boat || !checkInByUser) {
            throw new Error("Boat and user must be provided for check-in.");
        }
        const checkInDateTime = new Date().getTime(); // Current timestamp

        // Update the boat's status to available
        boat.isAvailable = true;

        const existingDefects = await this.defectManager.loadDefectsForBoat(boat.id);

        // Identify defects being reported for the first time for this boat
        const newDefects = defects.filter(d =>
            !existingDefects?.reportedDefects.some(e => e.defectType.id === d.defectType.id)
        );

        const mergedDefects: ReportedDefect[] = this.mergeDefects(existingDefects, defects);
        const defectsForBoat = new DefectsForBoat(mergedDefects, boat.id, checkInDateTime, existingDefects ? existingDefects.timestamp : Date.now());
        await this.defectManager.saveDefectsForBoat(defectsForBoat);
        await this.engineHoursManager.saveEngineHours(new EngineHours(boat.id, engineHours || 0, reason ?? ""));
        await this.boatManager.saveBoat(Boat.fromItem(boat));
        return newDefects;
    }

    private mergeDefects(existingDefects: DefectsForBoat | null, defects: ReportedDefect[]) : ReportedDefect[] {
        if (!existingDefects) {
            // If no existing defects, just create new reported defects
            return defects.map(defect => new ReportedDefect(defect.defectType, Date.now(), defect.additionalInfo));
        }

        // Merge existing defects with new ones
        const merged: ReportedDefect[] = [...existingDefects.reportedDefects];

        for (const defect of defects) {
            // Check if the defect already exists
            const existing = merged.find(d => d.defectType.id === defect.defectType.id);
            if (existing) {
                // If it exists, update the additional info
                existing.additionalInfo = existing.additionalInfo
                    ? `${existing.additionalInfo}; ${defect.additionalInfo}`
                    : defect.additionalInfo;
            } else {
                // If it doesn't exist, add it as a new reported defect
                merged.push(new ReportedDefect(defect.defectType, Date.now(), defect.additionalInfo));
            }
        }

        return merged;
    }

    public getPossibleDefectsList(): DefectType[] {
        return [
            new DefectType(1, 'Engine failure', 'The engine is not starting'),
            new DefectType(2, 'Electrical issue', 'There is a problem with the electrical system'),
            new DefectType(3, 'Hull damage', 'The hull is damaged'),
            new DefectType(4, 'Propeller problem', 'The propeller is not functioning'),
            new DefectType(5, 'Fuel system issue', 'There is a problem with the fuel system'),
            new DefectType(6, 'Steering malfunction', 'The steering is not working properly'),
            new DefectType(7, 'Navigation system failure', 'The navigation system is not working'),
            new DefectType(8, 'Safety equipment missing', 'Safety equipment is not on board'),
            new DefectType(9, 'Weather-related issues', 'Weather conditions are affecting the boat'),
            new DefectType(10, 'Other', 'Other unspecified issues')
        ];
    }

    /** Identify boats with issues */
    public async identifyBoatsWithIssues(): Promise<Boat[]> {
        const allBoats = await this.boatManager.listBoats();
        const boatsWithIssues: Boat[] = [];

        for (const boat of allBoats) {
            const defects = await this.defectManager.loadDefectsForBoat(boat.id);
            if (defects) {
                boat.defects = defects;
                boatsWithIssues.push(boat);
            }
        }

        return boatsWithIssues;
    }

    /** Get the defect status of a boat by its ID */
    public async getBoatDefectStatus(boatName: string): Promise<DefectsForBoat | null> {
        const boat = await this.boatManager.getBoatByName(boatName);
        if (!boat) {
            throw new Error(`Boat with name ${boatName} not found`);
        }

        // Get the defect status for the boat
        const defects = await this.defectManager.loadDefectsForBoat(boat.id);
        
        return defects;
    }    
}



export const dao = new DataAccessObject();