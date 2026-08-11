import express from "express";
import {logSchema} from "../z-types";


export function logValidations(req: express.Request, res: express.Response, next: express.NextFunction) {
    // check the validation of the response
    if (Array.isArray(req.body)) {
        for (let log of req.body) {
            logSchema.parse(log)
        }
    } else {
        logSchema.parse(req.body)
    }
    next()
}