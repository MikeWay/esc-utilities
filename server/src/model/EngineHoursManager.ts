import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { environment } from "../environment";
import { Config } from "./Config";
import { EngineHours } from "./EngineHours";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const TABLE_NAME = environment.ENGINE_HOURS_TABLE_NAME; // update as needed
const REGION = Config.getInstance().get('region');

export class EngineHoursManager {

    private client = new DynamoDBClient({ region: REGION });
    private ddbDocClient = DynamoDBDocumentClient.from(this.client);

    async saveEngineHours(engineHours: EngineHours): Promise<void> {
        if (engineHours.reason === "") {
            engineHours.reason = "Unknown";
        }
        await this.ddbDocClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: engineHours
        }));
    }

    async getEngineHoursByBoatId(boatId: string): Promise<EngineHours[]> {
        const params = {
            TableName: TABLE_NAME,
            KeyConditionExpression: "boatId = :boatId",
            ExpressionAttributeValues: {
                ":boatId": boatId
            }
        };
        const command = new QueryCommand(params);
        const result = await this.ddbDocClient.send(command);
        return result.Items as EngineHours[] || [];
    }

    async loadAllEngineHoursForAllBoats(): Promise<EngineHours[]> {
        console.log("Loading all engine hours for all boats using table:", TABLE_NAME);
        const params = {
            TableName: TABLE_NAME
        };
        const command = new ScanCommand(params);
        const result = await this.ddbDocClient.send(command);
        //return (result.Items ?? []).map(item => item as EngineHours);
        return (result.Items ?? []).map(item => EngineHours.fromItem(unmarshall(item) as EngineHours));
        //return result.Items as EngineHours[] || [];
    }

    sortEngineHoursByBoatId(engineHours: EngineHours[]): EngineHours[] {
        return engineHours.sort((a, b) => a.boatId.localeCompare(b.boatId));
    }

    sortEngineHoursByReason(engineHours: EngineHours[]): EngineHours[] {
        return engineHours.sort((a, b) => a.reason.localeCompare(b.reason));
    }

    mergeEngineHoursByReason(engineHours: EngineHours[]): Map<string, number> {
        const merged = new Map<string, number>();
        for (const eh of engineHours) {
            if (merged.has(eh.reason)) {
                merged.set(eh.reason, merged.get(eh.reason)! + eh.hours);
            } else {
                merged.set(eh.reason, eh.hours);
            }
        }
        // for (const [reason, hours] of merged.entries()) {
        //     merged.set(reason, Math.round(hours * 100) / 100);
        // }
        // return the map as an array

        return merged;
    }
}
