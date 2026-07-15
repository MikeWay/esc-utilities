
// Class representing a person in the system
export class Person {
    id: string; // Unique identifier for the person
    firstName: string; // Full name of the person
    lastName: string; //  last name of the person
    birthMonth: number; // Birth month of the person (1-12)
    birthDay: number; // Birth day of the person
    birthYear?: number; // Optional birth year of the person
    searchKey?: string; // Optional search key for quick lookups


    constructor(
        id: string,
        firstName: string,
        lastName: string,
        birthMonth: number,
        birthDay: number,
        birthYear?: number  
    ) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.birthMonth = birthMonth;
        this.birthDay = birthDay;
        this.birthYear = birthYear;
        this.searchKey = `${lastName.toLowerCase().charAt(0)}-${birthDay}-${birthMonth}`;
    }


    // toItem method to convert the person object to a format suitable for DynamoDB
    toItem(): {
        id: string,
        firstName: string,
        lastName: string,
        birthMonth: number,
        birthDay: number,
        birthYear?: number,
        search_key?: string
    } {
        return {
            id: this.id,
            firstName: this.firstName,
            lastName: this.lastName,
            birthMonth: this.birthMonth,
            birthDay: this.birthDay,
            birthYear: this.birthYear,
            search_key: this.searchKey,
        };
    }

    // Static method to create a Person instance from a DynamoDB item
    static fromItem(item: {
        id: string,
        firstName: string,
        lastName: string,
        birthMonth: number,
        birthDay: number,
        birthYear?: number,
        search_key?: string,
    }): Person {
        const person = new Person(
            item.id,
            item.firstName,
            item.lastName,
            item.birthMonth,
            item.birthDay,
            item.birthYear
        );
        person.searchKey = item.search_key;
        return person;
    }
}