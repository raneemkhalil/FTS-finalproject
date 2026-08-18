import express from "express";
import {pointers} from "../utils/set-pointers-urls.js";
import errors from "../errors.js";
import {isoTimestamp} from "../z-types.js";
import {Level} from "../db/queries/logs.js";

export async function paramValidations (req: express.Request, res: express.Response, next: express.NextFunction) {
    const cursor = req.query.cursor as string
    const limit = req.query.limit as string
    const since = req.query.since as string
    const until = req.query.until as string
    const level = req.query.level as string

    if (limit && isNaN(Number(limit))){
        throw new errors.BadRequestError(`Invalid Input: limit is non-numeric`)
    }
    if (Number(limit) > 1000) {
        throw new errors.BadRequestError("Maximum limit is 1000")
    }

    if (since) {
        try {
            isoTimestamp.parse(since)
        } catch (e) {
            if (e instanceof Error)
                throw new errors.BadRequestError(e.message)
            else throw e
        }
    }

    if (until) {
        try {
            isoTimestamp.parse(until)
        } catch (e) {
            if (e instanceof Error)
                throw new errors.BadRequestError(e.message)
            else throw e
        }
    }

    // check the validation of the cursor if exist
    if (cursor && pointers.previous.cursor !== cursor && pointers.next.cursor !== cursor) {
        throw new errors.BadRequestError("Invalid or malformed cursor!")
    }

    if (level && (level !== Level.DEBUG && level !== Level.ERROR && level !== Level.INFO && level !== Level.WARN) || level === "") {
        throw new errors.BadRequestError("Level must be one of these values [error, debug, info, warn].")
    }

    next()
}