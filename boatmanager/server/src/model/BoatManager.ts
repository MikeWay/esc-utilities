import { Boat } from "./Boat";
import {
  DynamoDBClient,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { Config } from "./Config";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Person } from "./Person";
import { environment } from "../environment";


const TABLE_NAME = environment.BOAT_TABLE_NAME; // update as needed
const REGION = Config.getInstance().get('region');

export class BoatManager {
  // private boats: Boat[] = [
  //   new Boat('1', 'Blue Rib', true),  // Example boat with id, name, and availability
  //   new Boat('2', 'Grey Rib', true),
  //   new Boat('3', 'Spare Rib', true),
  //   new Boat('4', 'Tornado II', true),
  //   new Boat('5', 'Yellow Rib', true),

  //   // { id: '2', name: 'Grey Rib', isAvailable: true },
  //   // { id: '3', name: 'Spare Rib', isAvailable: true },
  //   // { id: '4', name: 'Tornado II', isAvailable: true },
  //   // { id: '5', name: 'Yellow Rib', isAvailable: true },

  // ];


  private client = new DynamoDBClient({ region: REGION });
  private ddbDocClient = DynamoDBDocumentClient.from(this.client);


  async saveBoat(boat: Boat): Promise<void> {
    if (!boat || typeof boat.toItem !== 'function') {
      console.error('Invalid boat object provided to saveBoat:', boat);
      throw new Error('Invalid boat object');
    }

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: boat.toItem(),
    });

    try {
      await this.ddbDocClient.send(command);
      console.log(`Boat ${boat.name} saved to DynamoDB`);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'name' in err) {
        const errorObj = err as { name?: string; message?: string };
        if (errorObj.name === 'ResourceNotFoundException') {
          console.error('DynamoDB table not found:', TABLE_NAME);
        } else if (errorObj.name === 'ValidationException') {
          console.error('Validation error saving boat:', errorObj.message);
        } else {
          console.error('Error saving boat:', err);
        }
      } else {
        console.error('Error saving boat:', err);
      }
      throw err;
    }
  }


  async getAvailableBoats(): Promise<Boat[]> {
    // Return a list of available boats by calling listBoats
    const boats = await this.listBoats();
    return boats.filter(boat => boat.isAvailable === true);
  }

  async getCheckedOutBoats(): Promise<Boat[]> {
    // Return a list of checked out boats by calling listBoats
    const boats = await this.listBoats();
    return boats.filter(boat => !boat.isAvailable);
  }

  async checkOutBoat(theBoat: Boat, user: Person, reason: string): Promise<boolean> {
    // Check if the boat is available and mark it as checked out
    if (!theBoat || typeof theBoat.id !== 'string') {
      console.error('Invalid boat provided to checkOutBoat:', theBoat);
      throw new Error('Invalid boat object');
    }
    if (!theBoat || !theBoat.id) {
      console.error('Invalid boat provided to checkOutBoat:', theBoat);
      throw new Error('Invalid boat object');
    }
    const existingBoat = await this.getBoatByName(theBoat.name);
    if (!existingBoat) {
      console.error(`Boat with name ${theBoat.name} not found`);
      throw new Error(`Boat with name ${theBoat.name} not found`);
    }
    if (!existingBoat.isAvailable) {
      console.warn(`Boat with name ${theBoat.name} is not available for checkout`);
      return false;
    }
    // Mark the boat as checked out
    existingBoat.isAvailable = false;
    existingBoat.checkedOutTo = user;
    existingBoat.checkOutReason = reason;
    existingBoat.checkedOutToName = user.firstName + " " + user.lastName; // Assuming checkedOutTo is set in the Boat object
    existingBoat.checkedOutAt = new Date().getTime(); // Set the current date as checked out time
    existingBoat.checkedInAt = null; // Reset checked-in time 
    // Save the updated boat back to DynamoDB

    await this.saveBoat(existingBoat);
    const boat = await this.getBoatByName(theBoat.name);
    if (boat && boat.isAvailable) {
      return false;
    }
    return true;
  }

  async getBoatById(id: string): Promise<Boat | undefined> {
    if (!id) {
      return undefined;
    }
    const boatList = await this.listBoats();
    return boatList.find(boat => boat.id === id);
  }

  async getBoatByName(name: string): Promise<Boat | undefined> {
    if (!name) {
      return undefined;
    }

    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: { name: name },
    });

    try {
      const result = await this.ddbDocClient.send(command);
      if (!result.Item) {
        return undefined;
      }
      console.log(`Boat with name ${name} fetched from DynamoDB`);
      return Boat.fromItem(result.Item as Boat);
    } catch (err) {
      console.error(`Error fetching boat with name ${name}:`, err);
      throw err;
    }
  }

  public async listBoats(): Promise<Boat[]> {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
    });

    try {
      const result = await this.ddbDocClient.send(command);
      console.log(`✅ Fetched ${result.Count} boats from DynamoDB`);
      // Map the result to Boat instances
      if (!result.Items) {
        console.warn('No boats found in DynamoDB');
        return [];
      }
      // Ensure result.Items is an array before mapping
      //console.log(`Boats fetched: ${JSON.stringify(result.Items)}`);
      if (!Array.isArray(result.Items)) {
        console.warn('Result items are not an array:', result.Items);
        return [];
      }
      return (result.Items || []).map((item) => {
        const unmarshalled = unmarshall(item);
        return new Boat(unmarshalled.id, unmarshalled.name, unmarshalled.isAvailable, unmarshalled.checkedOutTo, unmarshalled.checkedOutAt, unmarshalled.checkedInAt, unmarshalled.checkOutReason);
      });
      //return (result.Items || []).map((item) => new Boat(unmarshall(item) as Boat));
    } catch (err) {
      console.error('❌ Error listing boats:', err);
      throw err;
    }
  }



  async checkInAllBoats(): Promise<void> {
    try {
      const boats = await this.listBoats()

      for (const boat of await boats) {
        if (!boat.isAvailable) {
          boat.isAvailable = true; // Mark the boat as available
          await this.saveBoat(boat);
          console.log(`✅ Boat ${boat.name} checked in`);
        }
      }
    } catch (err) {
      console.error('❌ Error checking in all boats:', err);
      throw err;
    }
  }

}

