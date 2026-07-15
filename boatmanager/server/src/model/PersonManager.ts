// Person Manager loads a list of persons and provides methods to access them

// class PersonManager {

import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import {  unmarshall } from '@aws-sdk/util-dynamodb';
import { Person } from './Person';
import { Config } from './Config';


const TABLE_NAME = 'Boat_Users'; // update as needed
const REGION = Config.getInstance().get('region');


export class PersonManager {

    private client = new DynamoDBClient({ region: REGION });

    private ddbDocClient = DynamoDBDocumentClient.from(this.client);


    // method to save a person to the database
    async savePerson(person: Person): Promise<void> {
        if (!person || typeof person.toItem !== 'function') {
            console.error('Invalid person object provided to savePerson:', person);
            throw new Error('Invalid person object');
        }

        const command = new PutCommand({
            TableName: TABLE_NAME,
            Item: person.toItem(),
        });

        try {
            await this.ddbDocClient.send(command);
            console.log(`Person ${person.firstName} ${person.lastName} saved to DynamoDB`);
        } catch (err: unknown) {
            console.error(`Error saving person with ID ${person.id}:`, err);
            throw err;
        }
    }

    // method to load all persons from the database
    async loadAllPersons(): Promise<Person[]> {
        const command = new ScanCommand({
            TableName: TABLE_NAME,
        });

        try {
            const response = await this.ddbDocClient.send(command);
            if (!response.Items) {
                return [];
            }
            return response.Items.map(item => Person.fromItem(unmarshall(item) as Person));

        } catch (err: unknown) {
            console.error('Error loading persons from DynamoDB:', err);
            throw err;
        }
    }

    async deleteAllPersons(): Promise<void> {
        const command = new ScanCommand({
            TableName: TABLE_NAME,
        }); 
        try {
            const response = await this.ddbDocClient.send(command);
            if (response.Items && response.Items.length > 0) {
                for (const item of response.Items) {
                    const person = Person.fromItem(unmarshall(item) as Person);
                    if(person && person.id && person.searchKey) {
                        console.log(`Deleting person with ID ${person.id} and searchKey ${person.searchKey}`);
                        await this.deletePerson(person.id, person.searchKey);
                    }
                }
            }
        } catch (err: unknown) {
            console.error('Error deleting persons from DynamoDB:', err);
            throw err;
        }
    }
    // method to delete a person by id
    async deletePerson(id: string, search_key: string): Promise<void> {
        const command = new DeleteCommand({
            TableName: TABLE_NAME,      
            Key: {id: id, search_key: search_key            },
        });     
        try {
            await this.ddbDocClient.send(command);
            console.log(`Person with ID ${id} deleted from DynamoDB`);
        } catch (err: unknown) {
            console.error(`Error deleting person with ID ${id}:`, err);
            throw err;
        }
    }

    // method to get all persons whose surname starts with a given letter
    async getPersonsBySurnameInitial(letter: string): Promise<Person[]> {
        const persons = await this.loadAllPersons();
        const lowerLetter = letter.toLowerCase();
        return persons
            .filter(p => p.lastName.toLowerCase().startsWith(lowerLetter))
            .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
    }

    // method to get a person by first letter of their last name , there day of birth and month of birth
    async getPersonByLastNameAndBirthDate(
        firstLetterLC: string,
        birthDay: number,
        birthMonth: number,
        birthYear: number
    ): Promise<Person[]> {
        firstLetterLC = firstLetterLC.toLowerCase();

        const searchPerson = new Person('0', '', firstLetterLC, birthMonth, birthDay, birthYear); // Create a dummy person to use the toItem method
        const peopleFound: Person[] = [];

        // construct a Person search key
        if (!firstLetterLC || !birthDay || !birthMonth) {
            console.error('Invalid parameters for getPersonByLastNameAndBirthDate:', { firstLetter: firstLetterLC, birthDay, birthMonth });
            throw new Error('Invalid parameters');

        }

        const command = new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'search_key = :searchKey',
            ExpressionAttributeValues: {
                ':searchKey': { S: searchPerson.searchKey! }
            }
        });

        try {
            const response = await this.ddbDocClient.send(command);
            if (response.Items && response.Items.length > 0) {
                for (const item of response.Items) {
                    const unmarshalled = unmarshall(item);
                    console.log('Unmarshalled item (getPersonByLastNameAndBirthDate):', unmarshalled);
                    const person = Person.fromItem(unmarshalled as Person);
                    if (
                        person.lastName.toLowerCase().startsWith(firstLetterLC) &&
                        person.birthDay === birthDay &&
                        person.birthMonth === birthMonth &&
                        (birthYear === 0 || person.birthYear === birthYear)
                    ) {
                        peopleFound.push(person);
                    }
                }

            }
            return peopleFound;
        } catch (err: unknown) {
            console.error('Error getting person by last name and birth date:', err);
            throw err;
        }
    }
}
export const personManager = new PersonManager();


