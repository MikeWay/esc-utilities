import { Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import session from 'express-session';
import { ParsedQs } from 'qs';
import { dao } from '../model/dao';
import { Boat } from "../model/Boat";
import { LogEntry } from '../model/log';

// Extend the SessionData interface to include pageBody



export class IndexController {


    public getHome(req: Request, res: Response): void {

        // test only


        res.locals.pageBody = 'page1';
        req.session.pageBody = res.locals.pageBody;
        res.render('index', { title: 'Page 1' });
    }



}


