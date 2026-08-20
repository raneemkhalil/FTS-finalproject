import {LogReq, logSchema} from "../z-types.js";
import express from "express";
import errors from "../errors.js";
import {Detail, SError} from "../types.js";

// check the validation of the response
export function logValidations(req: express.Request, res: express.Response, next: express.NextFunction) {
    let jsonE
    let rejected: Detail[] = []
    // the count of rejected logs
    let count: Record<number, number> = {};

    const contentType = req.header("Content-Type")
    if (!contentType || contentType === "text/plain") {
        throw new errors.BadRequestError("Invalid data!")
    }

    const logs: LogReq[] = req.body.logs

    if (logs.length === 0) {
        throw new errors.BadRequestError("Empty data!")
    }

    try {
        logSchema.parse(logs)
    } catch (e) {
        if (e instanceof Error) {
            // store the details of each invalid log
            jsonE = JSON.parse(e.message) as SError[]
        }
    }

    if (!jsonE || typeof jsonE === "undefined") {
        res.locals.validationResult = {
            accepted: logs.length,
            rejected: [],
            countRejected: {}
        }
        next()
        return
    }

    // to know the count of rejected logs using count object
    // get the details of each error and push it in rejected array
    for (let err of jsonE) {
        // no path when the structure is wrong
        if (err.path.length < 1) {
            throw new errors.BadRequestError("Invalid Data!")
        }
        const index = err.path[0]
        if (!(index in count)) {
            count[index] = 1;
        } else {
            count[index]++;
        }
        const detail: Detail = {
            index: index,
            reason: err.path[1] + ": " + err.message
        }
        rejected.push(detail)
    }

    const countOfAccepted = logs.length - Object.keys(count).length
    if (countOfAccepted === 0) {
        throw new errors.BadRequestError("Invalid logs!")
    }

    res.locals.validationResult = {
        accepted: countOfAccepted,
        rejected: rejected,
        countRejected: count
    }
    next()
}