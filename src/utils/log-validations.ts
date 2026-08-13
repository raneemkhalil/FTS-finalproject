import {LogReq, logSchema} from "../z-types";
import express from "express";
import errors from "../errors";

// check the validation of the response
export function logValidations(req: express.Request): result {
    let jsonE
    let rejected: Detail[] = []
    let count: Record<number, number> = {};

    const contentType = req.header("Content-Type")
    if (!contentType || contentType === "text/plain") {
        throw new errors.BadRequestError("Invalid data!")
    }

    const logs: LogReq[] = req.body.logs

    try {
        logSchema.parse(logs)
    } catch (e) {
        if (e instanceof Error) {
            // store the details of each invalid log
            jsonE = JSON.parse(e.message) as SError[]
        }
    }

    if (!jsonE || typeof jsonE === "undefined") {
        return {
            accepted: logs.length,
            rejected: [],
            count: {}
        }
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

    const countOfRejected = logs.length - Object.keys(count).length
    if (countOfRejected === 0) {
        throw new errors.BadRequestError("Invalid logs!")
    }

    return {
        accepted: countOfRejected,
        rejected: rejected,
        count: count
    }
}