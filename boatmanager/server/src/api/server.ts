import { Boat } from "../model/Boat";
import { dao } from "../model/dao";
import { Request, Response } from 'express';
import { Person } from "../model/Person";
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import { sendFaultNotificationEmail, sendNewFaultNotificationEmail } from '../email/emailService';
import { Config } from '../model/Config';
import { VERSION } from '../version';


// write the current directory to the console
console.log("Current directory:", __dirname);
// convert the relative path to an absolute path
import path from 'path';
import { LogEntry } from "../model/log";
import { DefectType, ReportedDefect } from "../model/defect";
const absolutePath = path.resolve(__dirname, '../keys/private.key');
//console.log("Absolute path to private key:", absolutePath);
export const RSA_PRIVATE_KEY = fs.readFileSync(absolutePath, 'utf8');

class ApiServer {
  constructor() {
    this.init();
  }

  init() {
    console.log("API Server initialized");
  }

  start() {
    console.log("Server started");
  }

  public async checkPerson(req: Request, res: Response) {
    // get json object from request
    // get month from the request
    const month = req.body.month || new Date().getMonth() + 1;
    // get day from the request
    const day = req.body.day || new Date().getDate();
    const year = req.body.year || 0;
    // get familyInitial from the request
    const familyInitial = req.body.familyInitial || '';


    try {
      const peopleFound = await dao.personManager.getPersonByLastNameAndBirthDate(
        familyInitial.toString(),
        Number(day),
        Number(month),
        Number(year)
      );
      return res.json(peopleFound);
    } catch (error) {
      console.error("Error in checkPerson:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  public async checkInBoat(req: Request, res: Response) {
    const boat: Boat = req.body.boat;
    const checkInByUser: Person = req.body.user;
    const defects: ReportedDefect[] = req.body.problems || [];
    //const additionalInfo: string = req.body.additionalInfo || '';
    const engineHours: number = req.body.engineHours || 0;
    const reason: string = boat.checkOutReason || 'No reason provided';

    try {
      const newDefects = await dao.checkInBoat(boat, checkInByUser, defects, engineHours, reason);
      const logEntry = new LogEntry({
        action: 'check in',
        boatName: boat.name,
        personName: checkInByUser.firstName + " " + checkInByUser.lastName,
        checkOutDateTime: boat.checkedOutAt === null ? undefined : boat.checkedOutAt, // Assuming this is the time when the boat was checked out
        checkInDateTime: Date.now(),
        checkOutReason: boat.checkOutReason === null ? undefined : boat.checkOutReason,
        defect: defects.map(d => d.defectType.name).join(', '), // Join defect names into a string
        additionalInfo: defects.map(d => d.additionalInfo).join(', '),
        engineHours: engineHours,
        logKey: `${boat.name}-${new Date().toISOString()}`
      });

      // Save the log entry
      dao.logManager.saveLogEntry(logEntry);

      const personName = `${checkInByUser.firstName} ${checkInByUser.lastName}`;

      // Notify training team if faults were reported
      if (defects.length > 0) {
        sendFaultNotificationEmail(boat.name, defects, personName, engineHours)
          .catch(err => console.error('Failed to send fault notification email:', err));
      }

      // Notify bosun for defects being reported for the first time on this boat
      if (newDefects.length > 0) {
        const recipients: string[] = Config.getInstance().get('new_fault_notification_recipients')
          ?? ['bosun@exesc.org'];
        sendNewFaultNotificationEmail(boat.name, newDefects, personName, engineHours, recipients)
          .catch(err => console.error('Failed to send new-fault notification email:', err));
      }

      return res.status(200).json({ message: "Boat checked in successfully" });
    } catch (error) {
      console.error("Error checking in boat:", error);
      return res.status(500).json({ error: "Failed to check in boat" });
    }
  }


  /** request includes: boat: Boat and user: Person  */
  public async checkOutBoat(req: Request, res: Response) {
    const boat: Boat = req.body.boat;
    const user: Person = req.body.user;
    const reason: string = req.body.reason || 'No reason provided';

    // check out the boat
    try {
      boat.checkedOutTo = user;
      boat.checkedOutAt = new Date().getTime(); // Set the current date as checked out time
      boat.checkedInAt = null; // Reset checked-in time
      await dao.boatManager.checkOutBoat(boat, user, reason);
      const logEntry = new LogEntry({
        action: 'check out',
        boatName: boat.name,
        personName: user.firstName + " " + user.lastName,
        checkOutDateTime: boat.checkedOutAt,
        checkOutReason: reason,
        logKey: `${boat.name}-${new Date().toISOString()}`
      });
      await dao.logManager.saveLogEntry(logEntry);
      return res.status(200).json({ message: "Boat checked out successfully" });
    } catch (error) {
      console.error("Error checking out boat:", error);
      return res.status(500).json({ error: "Failed to check out boat" });
    }
  }

  // method to get a list of available boats
  public async getAvailableBoats(req: Request, res: Response) {
    try {
      const boats = await dao.boatManager.getAvailableBoats();
      return res.status(200).json(boats);
    } catch (error) {
      console.error("Error fetching available boats:", error);
      return res.status(500).json({ error: "Failed to fetch available boats" });
    }
  }

  // method to get a list of checked out boats
  public async getCheckedOutBoats(req: Request, res: Response) {
    try {
      const boats = await dao.boatManager.getCheckedOutBoats();
      return res.status(200).json(boats);
    } catch (error) {
      console.error("Error fetching checked out boats:", error);
      return res.status(500).json({ error: "Failed to fetch checked out boats" });
    }
  }

  public async getPossibleDefectsList(req: Request, res: Response) {
    try {
      const defects = await dao.getPossibleDefectsList();
      return res.status(200).json(defects);
    } catch (error) {
      console.error("Error fetching possible defects:", error);
      return res.status(500).json({ error: "Failed to fetch possible defects" });
    }
  }


  public getVersion(req: Request, res: Response) {
    return res.status(200).json({ version: VERSION });
  }

  public getCheckinReasons(req: Request, res: Response) {
    const reasons: string[] = Config.getInstance().get('checkin_reasons') ?? [
      'Boat not checked in correctly',
      'Other',
    ];
    return res.status(200).json(reasons);
  }

  public login(req: Request, res: Response) {

    const email = req.body.email,
      password = req.body.password;

    if (validatePassword(password)) {
      const userId = '666';

      const jwtBearerToken = jwt.sign({}, RSA_PRIVATE_KEY, {
        algorithm: 'RS256',
        //expiresIn: 120,
        subject: userId
      });

      // send the JWT back to the user
      res.status(200).json({
        token: jwtBearerToken
      });
      console.log(`User ${userId} logged in successfully`);
      // TODO - multiple options available                              
    }
    else {
      // send status 401 Unauthorized
      res.sendStatus(401);
    }
  }

}

export const apiServer = new ApiServer();
function validatePassword(password: string): boolean {
  // Implement your password validation logic here
  return password === 'rowlocks';
}

