import express from "express";
import errors from "../errors.js";
import {isoTimestampParam} from "../z-types.js";
import {Level} from "../db/queries/logs.js";
import {decodeCursor} from "../db/utils/parse-cursor.js";

export async function paramValidations (req: express.Request, res: express.Response, next: express.NextFunction) {
    const cursor = req.query.cursor as string
    const limit = req.query.limit as string
    const since = req.query.since as string
    const until = req.query.until as string
    const level = req.query.level as string
    const service = req.query.service as string
    const  q = req.query.q as string

    if (limit === "") {
        throw new errors.BadRequestError(`Invalid Input: limit is empty`)
    }

    if (limit && isNaN(Number(limit))){
        throw new errors.BadRequestError(`Invalid Input: limit is non-numeric`)
    }
    if (limit && Number(limit) > 1000) {
        throw new errors.BadRequestError("Maximum limit is 1000")
    }
    if (limit && (Number(limit) < -1 || !Number.isInteger(Number(limit)))) {
        throw new errors.BadRequestError("Invalid limit")
    }

    if (since) {
        try {
            isoTimestampParam.parse(since)
        } catch (e) {
            throw new errors.BadRequestError(`${e}`)
        }
    }

    if (until) {
        try {
            isoTimestampParam.parse(until)
        } catch (e) {
            throw new errors.BadRequestError(`${e}`)
        }
    }

    // check the validation of the cursor if exist
    if (cursor) {
        const date = decodeCursor(cursor)
        if (date) {
            try {
                isoTimestampParam.parse(date)
            } catch (e) {
                throw new errors.BadRequestError(`${e}`)
            }
        } else {
            throw new errors.BadRequestError("Invalid cursor")
        }
    }

    if (level && (level !== Level.DEBUG && level !== Level.ERROR && level !== Level.INFO && level !== Level.WARN) || level === "") {
        throw new errors.BadRequestError("Level must be one of these values [error, debug, info, warn].")
    }

    if (service === "")
        throw new errors.BadRequestError("Service must not be empty")
    if (q === "")
        throw new errors.BadRequestError("Message must not be empty")

    next()
}