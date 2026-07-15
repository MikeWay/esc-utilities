import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { DefectsForBoat, DefectType } from "./defect";

import { DeleteCommand, DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { Config } from "./Config";
import { environment } from "../environment";
import { Boat } from "./Boat";

const TABLE_NAME = environment.DEFECTS_TABLE_NAME; // update as needed
const REGION = Config.getInstance().get('region');
const marshallOptions = {
  convertClassInstanceToMap: true 
}

export class DefectManager {

    private client = new DynamoDBClient({ region: REGION });
    private translateConfig = { marshallOptions };
    private ddbDocClient = DynamoDBDocumentClient.from(this.client, this.translateConfig);
  
    public async saveDefectsForBoat(defectsForBoat: DefectsForBoat): Promise<void> {
        // Implement the logic to save defects for a specific boat



        const command = new PutCommand({
            TableName: TABLE_NAME,
            Item: defectsForBoat.toItem(), // Assuming DefectsForBoat has a toItem() method that returns the item structure
        });
        await this.ddbDocClient.send(command);
    }

    // load defects for a specific boatexpect.any(QueryCommand)
    public async loadDefectsForBoat(boatId: string): Promise<DefectsForBoat | null> {

        const scanCommand = new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: "boatId = :boatId",
            ExpressionAttributeValues: {
                ":boatId": boatId
            }
        });
        const scanResult = await this.ddbDocClient.send(scanCommand);
        if (scanResult.Items && scanResult.Items.length > 0) {
            const item = scanResult.Items[0];
            return new DefectsForBoat(
                item.reportedDefects,
                item.boatId ?? "",
                
                item.originallyReported ? parseInt(item.originallyReported) : Date.now(),
                item.timestamp ? parseInt(item.timestamp) : Date.now()
            );
        }
        return null;

    }

    public async clearAllBoatFaults(): Promise<void> {
        let ExclusiveStartKey: Record<string, any> | undefined = undefined;

        do {
            const scanCommand = new ScanCommand({
                TableName: TABLE_NAME,
                ProjectionExpression: "boatId, #ts",
                ExpressionAttributeNames: { "#ts": "timestamp" },
                ExclusiveStartKey
            });

            const scanResult = await this.ddbDocClient.send(scanCommand);

            if (scanResult.Items && scanResult.Items.length > 0) {
                for (const item of scanResult.Items) {
                    if (item.boatId !== undefined && item.timestamp !== undefined) {
                        await this.ddbDocClient.send(
                            new DeleteCommand({
                                TableName: TABLE_NAME,
                                Key: { boatId: item.boatId, timestamp: item.timestamp }
                            })
                        );
                    }
                }
            }

            ExclusiveStartKey = scanResult.LastEvaluatedKey as Record<string, any> | undefined;
        } while (ExclusiveStartKey);
    }

    public async deleteDefectsForBoat(boat: DefectsForBoat): Promise<void> {
        const scanCommand = new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: "boatId = :boatId",
            ExpressionAttributeValues: {
                ":boatId": boat.boatId
            }
        });
        const scanResult = await this.ddbDocClient.send(scanCommand);
        if (scanResult.Items && scanResult.Items.length > 0) {
            for (const item of scanResult.Items) {
                if (item.boatId) {
                    await this.ddbDocClient.send(
                        new DeleteCommand({
                            TableName: TABLE_NAME,
                            Key: { boatId: item.boatId, timestamp: item.timestamp}
                        })
                    );
                }
            }
        }
    }
}

      





