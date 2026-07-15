import { Person } from "./Person";


export class Boat {
    id: string = '';
    name: string = '';
    isAvailable: boolean = true;
    checkedOutTo: Person | null = null;
    checkedOutToName: string | null = null; // field to store the name of the person who checked out the boat
    checkedOutAt: number | null = null;
    checkedInAt: number | null = null;
    checkOutReason: string | null = null;
    constructor(id: string, name: string, isAvailable: boolean = true, checkedOutTo?: Person | null, checkedOutAt?: number | null, checkedInAt?: number | null, checkOutReason?: string | null) {
        this.id = id;
        this.name = name;
        this.isAvailable = isAvailable;
        this.checkedOutToName = checkedOutTo ? (checkedOutTo.firstName + " " + checkedOutTo.lastName) : null;
        this.checkedOutTo = checkedOutTo || null;
        this.checkedOutAt = checkedOutAt ?? null;
        this.checkedInAt = checkedInAt ?? null;
        this.checkOutReason = checkOutReason ?? null;
    }   
// export class Boat {


    // toString(): string {
    //     return `Boat ID: ${this.id}, Name: ${this.name}, Available: ${this.isAvailable}`;
    // }

    toItem(): { id: string; name: string; isAvailable: boolean, checkedOutToName: string, checkedOutTo?: Person | null, checkedOutAt?: number | null, checkedInAt?: number | null, checkOutReason?: string | null } {
        return {
          id: this.id,
          name: this.name,
          isAvailable: this.isAvailable,
          checkedOutTo: this.checkedOutTo,
          checkedOutToName: this.checkedOutToName || '',
          checkedOutAt: this.checkedOutAt,
          checkedInAt: this.checkedInAt,
          checkOutReason: this.checkOutReason,
        };
      }
}
