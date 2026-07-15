import { BoatManager } from './BoatManager';
import { Boat } from './Boat';
import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {                
DynamoDBDocumentClient,
PutCommand,
} from '@aws-sdk/lib-dynamodb';

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('BoatManager', () => {
let boatManager: BoatManager;
let mockSend: jest.Mock;

beforeEach(() => {
    boatManager = new BoatManager();
    mockSend = jest.fn();
    (DynamoDBDocumentClient.from as jest.Mock).mockReturnValue({
        send: mockSend,
    });
});

afterEach(() => {
    jest.clearAllMocks();
});

// describe('saveBoat', () => {
//     it('should save a boat to DynamoDB successfully', async () => {
//         const boat = new Boat('6', 'Red Rib', true);
//         mockSend.mockResolvedValueOnce({});

//         await expect(boatManager.saveBoat(boat)).resolves.not.toThrow();
//         expect(mockSend).toHaveBeenCalledTimes(1);
//         expect(mockSend).toHaveBeenCalledWith(
//             expect.objectContaining({
//                 TableName: 'Boats',
//                 Item: boat.toItem(),
//             })
//         );
//     });

//     it('should throw an error if saving to DynamoDB fails', async () => {
//         const boat = new Boat('7', 'Green Rib', true);
//         const error = new Error('DynamoDB error');
//         mockSend.mockRejectedValueOnce(error);

//         await expect(boatManager.saveBoat(boat)).rejects.toThrow('DynamoDB error');
//         expect(mockSend).toHaveBeenCalledTimes(1);
//         expect(mockSend).toHaveBeenCalledWith(
//             expect.objectContaining({
//                 TableName: 'Boats',
//                 Item: boat.toItem(),
//             })
//         );
//     });
// });
});