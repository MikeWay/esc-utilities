// Person Manager loads a list of persons and provides methods to access them

// class AdminPersonManager {

import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import {  unmarshall } from '@aws-sdk/util-dynamodb';
import { AdminPerson } from './AdminPerson';
import { Config } from './Config';
import { environment } from '../environment';

const TABLE_NAME = environment.ADMIN_PERSON_TABLE_NAME;
const REGION = Config.getInstance().get('region');


export class AdminPersonManager {

    private client = new DynamoDBClient({ region: REGION });

    private ddbDocClient = DynamoDBDocumentClient.from(this.client);

    async getAdminByEmail(email: string): Promise<AdminPerson | null> {
        const command = new GetCommand({
            TableName: TABLE_NAME,
            Key: { email_address: email }
        });

        try {
            const response = await this.ddbDocClient.send(command);
            console.log('Response from DynamoDB:', response);
            if (response.Item) {

                return AdminPerson.fromItem(response.Item as AdminPerson);
            }
            return null;
        } catch (err: unknown) {
            console.error(`Error getting admin by email ${email}:`, err);
            throw err;
        }
    }


    // method to save a person to the database
    async saveAdminPerson(person: AdminPerson): Promise<void> {
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
            console.error(`Error saving person with email ${person.email_address}:`, err);
            throw err;
        }
    }

    // method to load all persons from the database
    async getAllPersons(): Promise<AdminPerson[]> {
        const command = new ScanCommand({
            TableName: TABLE_NAME,
        });

        try {
            const response = await this.ddbDocClient.send(command);
            if (!response.Items) {
                return [];
            }
            return response.Items.map(item => AdminPerson.fromItem(unmarshall(item) as AdminPerson));

        } catch (err: unknown) {
            console.error('Error loading persons from DynamoDB:', err);
            throw err;
        }
    }

        // method to delete a person by email address
    async deletePerson(email_address: string): Promise<void> {
        const command = new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { email_address: email_address},
        });
        try {
            await this.ddbDocClient.send(command);
            console.log(`AdminPerson with email ${email_address} deleted from DynamoDB`);
        } catch (err: unknown) {
            console.error(`Error deleting person with email ${email_address}:`, err);
            throw err;
        }
    }

    // method to get a person by first letter of their last name , there day of birth and month of birth
   
}
export const adminPersonManager = new AdminPersonManager();


