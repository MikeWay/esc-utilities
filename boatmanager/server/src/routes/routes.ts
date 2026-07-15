import { Router  } from 'express';
//import { IndexController } from '../controllers';

import { adminController } from '../controllers/adminController';
import multer from 'multer';
import { apiServer } from '../api/server';
import { Request } from 'express-jwt';

import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { Response, NextFunction } from 'express';
import { AdminPerson } from '../model/AdminPerson';
import { dao } from '../model/dao';

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const absolutePath = path.resolve(__dirname, '../keys/public.key');
//console.log("Absolute path to public key:", absolutePath);
const RSA_PUBLIC_KEY = fs.readFileSync(absolutePath, 'utf8');

const router = Router();


export function setRoutes(app: any) {
    app.use('/', router);
    //router.post('/navigate', navigationController.navigate.bind(navigationController));
    router.get('/admin/report', adminController.genLogReports.bind(adminController));
    router.get('/admin', checkIfAdminAuthenticated, adminController.getHome.bind(adminController));
    router.post('/admin/checkInAll', checkIfAdminAuthenticated, adminController.checkInAllBoats.bind(adminController));
    router.get('/admin/listUsers', checkIfAdminAuthenticated, adminController.listUsers.bind(adminController));
    router.get('/admin/add-admin-user', checkIfAdminAuthenticated, adminController.inputAddAdminUser.bind(adminController));
    router.post('/admin/add-admin-user', checkIfAdminAuthenticated, adminController.saveNewAdminUser.bind(adminController));    
    router.get('/admin/set-password', checkIfAdminAuthenticated, adminController.inputAdminPassword.bind(adminController));
    router.post('/admin/set-password', checkIfAdminAuthenticated, adminController.setAdminPassword.bind(adminController));
    router.get('/admin/loadUsers', checkIfAdminAuthenticated, adminController.loadNewUsers.bind(adminController));
    router.get('/admin/deleteAllUsers', checkIfAdminAuthenticated, adminController.deleteAllUsers.bind(adminController));
    router.post('/admin/upload-users', checkIfAdminAuthenticated, upload.single('csvFile'), adminController.uploadUsers.bind(adminController));
    router.get('/admin/trialUploadUsers', checkIfAdminAuthenticated, adminController.trialUploadUsers.bind(adminController));
    router.post('/admin/trial-upload-users', checkIfAdminAuthenticated, upload.single('csvFile'), adminController.trialUploadUsersProcess.bind(adminController));
    router.post('/api/check-person', checkIfAuthenticated, apiServer.checkPerson.bind(apiServer));
    router.post('/api/check-out-boat', checkIfAuthenticated, apiServer.checkOutBoat.bind(apiServer));
    router.post('/api/check-in-boat', checkIfAuthenticated, apiServer.checkInBoat.bind(apiServer));
    router.get('/api/available-boats', checkIfAuthenticated, apiServer.getAvailableBoats.bind(apiServer));
    router.get('/api/checked-out-boats', checkIfAuthenticated, apiServer.getCheckedOutBoats.bind(apiServer));
    router.get('/api/defects-list', checkIfAuthenticated, apiServer.getPossibleDefectsList.bind(apiServer));
    router.get('/api/checkin-reasons', checkIfAuthenticated, apiServer.getCheckinReasons.bind(apiServer));
    router.get('/api/version', apiServer.getVersion.bind(apiServer));
    router.post('/api/login', apiServer.login.bind(apiServer));
    router.get('/admin-login', adminController.adminLogin.bind(adminController));
    router.post('/admin/login', adminController.login.bind(adminController));
    router.get('/admin/logout', adminController.adminLogout.bind(adminController));
    router.post('/admin/delete-user', checkIfAdminAuthenticated, adminController.deleteAdminUser.bind(adminController));
    router.get('/admin/boatsWithIssues', checkIfAdminAuthenticated, adminController.boatsWithIssues.bind(adminController));
    router.get('/admin/boatsCheckedOut', checkIfAdminAuthenticated, adminController.boatsCheckedOut.bind(adminController));
    router.get('/admin/usageReport', checkIfAdminAuthenticated, adminController.getUsageReport.bind(adminController));
    router.get('/admin/defectsForBoat/:boatId', checkIfAdminAuthenticated, adminController.defectsForBoat.bind(adminController));
    router.get('/admin/engineHoursForBoat/:boatId', checkIfAdminAuthenticated, adminController.reportEngineHoursForBoat.bind(adminController));
    router.get('/admin/engineHours', checkIfAdminAuthenticated, adminController.reportEngineHours.bind(adminController));
    router.get('/admin/engineHoursByUse', checkIfAdminAuthenticated, adminController.reportEngineHoursByUserGroup.bind(adminController));
    router.get('/admin/engineHoursByUseByBoat', checkIfAdminAuthenticated, adminController.reportEngineHoursByUseByBoat.bind(adminController));
    router.post('/admin/checkIfDefectToBeCleared', checkIfAdminAuthenticated, adminController.checkIfDefectToBeCleared.bind(adminController));
    router.post('/admin/confirmDefectCleared', checkIfAdminAuthenticated, adminController.confirmDefectCleared.bind(adminController));
    router.post('/admin/clearAllBoatFaults', checkIfAdminAuthenticated, adminController.clearAllBoatFaults.bind(adminController));
    router.get('/admin/weeklyReport', checkIfAdminAuthenticated, adminController.triggerWeeklyReport.bind(adminController));
    router.post('/admin/weeklyReport', checkIfAdminAuthenticated, adminController.submitWeeklyReport.bind(adminController));
    router.get('/admin/findMembers', checkIfAdminAuthenticated, adminController.findMembersForm.bind(adminController));
    router.post('/admin/findMembers', checkIfAdminAuthenticated, adminController.findMembersSearch.bind(adminController));
    router.get('/admin/developerOptions', checkIfAdminAuthenticated, adminController.developerOptions.bind(adminController));
}



// const checkIfAuthenticated = expressjwt({
//     secret: RSA_PUBLIC_KEY,
//     algorithms: ['RS256']
// });
function checkIfAuthenticated(
    req: Request,
    res: Response,
    next: NextFunction
) {
    req.headers.authorization = req.headers.authorization || '';
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
        console.log('Unauthorized: No token provided');
        return res.status(401).json({ error: 'Unauthorized' });
    }
    // Verify the JWT token
    jwt.verify(
        token,
        RSA_PUBLIC_KEY,
        (err, decoded) => {
            if (err) {
                console.error('JWT verification failed:', err);
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // If the token is valid, proceed
            // console.log('Decoded JWT:', decoded);
            if (typeof decoded !== 'object' || decoded === null) {
                console.error('Decoded JWT is not an object:', decoded);
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Attach the decoded token to the request object
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (req as any).user = decoded;
        }
    );
    next();
}

interface AuthCookiePayload {
    isAdmin?: boolean;
    [key: string]: any;
}

function checkIfAdminAuthenticated(
    req: Request,
    res: Response,
    next: NextFunction
){
    if (!req.cookies) {
        console.log('Unauthorized: Cookies not found');
        throw new Error('NOT-ADMIN');
        }// TODO invalidate the JWT token for this user
    const authCookie: string | undefined = req?.cookies['jwt'];
    if (!authCookie) {
        console.log('Unauthorized: JWT not found');
        throw new Error('NOT-ADMIN');
    }
    // Verify the JWT tokenNOT-ADMIN
    jwt.verify(
        authCookie,
        RSA_PUBLIC_KEY,
        (err, decoded) => {
            // decoded can be string | JwtPayload
            let isAdmin = false;
            let user: AdminPerson | undefined = undefined;
            if (typeof decoded === 'object' && decoded !== null && 'isAdmin' in decoded) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                isAdmin = Boolean((decoded as any).isAdmin);
                // extract the user information from the decoded token as an AdminPerson
                user = (decoded as any).user as AdminPerson;
            }
            if (err || !isAdmin || !user) {
                throw new Error('NOT-ADMIN');
                //return res.status(403).json({ error: 'Forbidden' });
            }
            if (user && user.email_address) {
                if (!dao.tokenStore.has(user.email_address)) {
                    console.error('Token  not found in tokenStore:', authCookie);
                    throw new Error('NOT-ADMIN');
                }
            }
            // save user in the session
            req.session.user = user;
            // If the token is valid and the user is an admin, proceed
            next();
        }
    );
}

// const checkIfAdminAuthenticated = expressjwt({
//     secret: RSA_PUBLIC_KEY,
//     algorithms: ['RS256'],
//     getToken: (req: Request) => {

//         const token = req.headers.authorization?.split(' ')[1];
//         if(!req.auth?.isAdmin) {
//             throw new Error('NOT-ADMIN');
//             //return undefined;
//         }
//         return token || undefined;
       
//     }
// }); 