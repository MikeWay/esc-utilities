import { Boat } from "../model/Boat";
import { Defect, DefectType } from "../model/defect";

export class AppState {
    engineHours: number;
  returnedKey: any;
  refueledBoat: any;

    constructor() {
        this.reasonForCheckout = null;
        this.currentBoat = null;
        this.currentLog = null;
        this.currentPerson = null;
        this.isLoading = false;
        this.error = null;
        this.checkOutInProgress = undefined;
        this.enableNextButton = false;
        this.enablePreviousButton = false;
        this.problemsWithBoat = false;
        this.engineHours = 0;
        this.returnedKey = null;
        this.refueledBoat = null;
    }
    public reasonForCheckout: string | null = null;
    public currentBoat: Boat | null = null;


    public currentLog: any = null;
    public currentPerson: any = null;
    public isLoading: boolean = false;
    public error: string | null = null;
    public message: string = 'Welcome to Boat Manager';

    public checkOutInProgress: boolean | undefined;
    public checkInInProgress: boolean | undefined;
    public enableNextButton: boolean = false;
    public enablePreviousButton: boolean = false;
    public problemsWithBoat: boolean | undefined;
    public defects: Defect[] = [];
    public notTheOriginalUser: boolean = false;
    public checkinReason: string | null = null;


    public reset(): void {
        this.reasonForCheckout = null;
        this.currentBoat = null;
        this.currentLog = null;
        this.currentPerson = null;
        this.isLoading = false;
        this.error = null;
        this.message = 'Welcome to Boat Manager';
        this.checkOutInProgress = undefined;
        this.checkInInProgress = undefined;
        this.enableNextButton = false;
        this.enablePreviousButton = false;
        this.problemsWithBoat = false;
        this.defects = [];
        this.engineHours = 0;
        this.returnedKey = null;
        this.refueledBoat = null;
        this.notTheOriginalUser = false;
        this.checkinReason = null;
    }
}

export interface AppStateInterface {

    reasonForCheckout: string | null;
    currentBoat: Boat | null;
    currentLog: any;
    currentPerson: any;
    isLoading: boolean;
    error: string | null;
    message: string;
    checkOutInProgress?: boolean;
    checkInInProgress?: boolean;
    enableNextButton?: boolean;
    enablePreviousButton?: boolean;
}