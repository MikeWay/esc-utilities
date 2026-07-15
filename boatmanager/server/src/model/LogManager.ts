import { LogEntry, LogEntryItem } from "./log";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { Config } from '../model/Config';
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { environment } from "../environment";

const LOG_TABLE_NAME = environment.LOG_TABLE_NAME;
const REGION = environment.region || Config.getInstance().get('region'); // Use environment variable or fallback to config
const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);


export class LogManager {

    // function to save a LogEntry object to DynamoDB
    public async saveLogEntry(logEntry: LogEntry): Promise<void> {
        try {
            const command = new PutCommand({
                TableName: LOG_TABLE_NAME,
                Item: logEntry.toItem(),
                ConditionExpression: 'attribute_not_exists(logKey)', // Ensure logKey is unique
            });

            await docClient.send(command);
            console.log('Log entry saved successfully:', logEntry);
        } catch (error) {
            console.error('Error saving log entry:', error);
            throw new Error('Failed to save log entry');
        }
    }

    public async getLogEntriesForDateRange(fromMs: number, toMs: number): Promise<LogEntry[]> {
        const all = await this.listLogEntries();
        return all
            .filter(e => (e.checkOutDateTime ?? 0) >= fromMs && (e.checkOutDateTime ?? 0) <= toMs)
            .sort((a, b) => (b.checkOutDateTime ?? 0) - (a.checkOutDateTime ?? 0));
    }

    public async listLogEntries(): Promise<LogEntry[]> {
        const command = new ScanCommand({
            TableName: LOG_TABLE_NAME,
        });
        const result = await docClient.send(command);
        //const items =  as LogEntryItem[];

        return (result.Items ?? [])
            .map((item) => new LogEntry(unmarshall(item)))
            .sort((a, b) => {
                const dateA = a.checkOutDateTime ?? 0;
                const dateB = b.checkOutDateTime ?? 0;
                return dateA - dateB;
            });
    }
}

export const logManager = new LogManager();
