import express from "express";
import errors from "../errors";
import {Level} from "../db/queries/logs";

export function setConditions(req: express.Request, date: Date | null, type: string | null) {
    const level = req.query.level as string
    const service = req.query.service as string
    const q = req.query.q as string

    if (level && level !== Level.DEBUG && level !== Level.ERROR && level !== Level.INFO && level !== Level.WARN) {
        throw new errors.BadRequestError("Level must be one of these values [error, debug, info, warn].")
    }

    const since = req.query.since ? new Date(req.query.since as string) : undefined;
    const until = req.query.until ? new Date(req.query.until as string) : undefined;

    let dateIsoStr = date?.toISOString()
    let sinceIsoStr
    let untilIsoStr

    try {
        sinceIsoStr = since?.toISOString()
        untilIsoStr = until?.toISOString()
    } catch (e) {
        throw new errors.BadRequestError(`${e}`)
    }

    if (since && until && (since > until)) {
        throw new errors.BadRequestError("Since shouldn't be greater than until!")
    }

    const queries = Object.keys(req.query)
    let attrKey = queries.find((value) => value.includes("attr")) || ""
    let attrVal = req.query[attrKey] as string
    attrKey = attrKey.split(".")[1]

    let conditions: string[] = []
    if (!dateIsoStr && sinceIsoStr && untilIsoStr) {
        conditions.push(`time >= '${sinceIsoStr}' AND time < '${untilIsoStr}'`)
    }
    if (!dateIsoStr && sinceIsoStr && !untilIsoStr) {
        conditions.push(`time >= '${sinceIsoStr}'`)
    }
    if (!dateIsoStr && !sinceIsoStr && untilIsoStr) {
        conditions.push(`time < '${untilIsoStr}'`)
    }
    if (dateIsoStr && type === "next" && sinceIsoStr && untilIsoStr) {
        conditions.push(`time < '${dateIsoStr}' AND time >= '${sinceIsoStr}' AND time < '${untilIsoStr}'`)
    }
    if (dateIsoStr && type === "next" && sinceIsoStr && !untilIsoStr) {
        conditions.push(`time < '${dateIsoStr}' AND time >= '${sinceIsoStr}'`)
    }
    if (dateIsoStr && type === "next" && !sinceIsoStr && untilIsoStr) {
        conditions.push(`time < '${dateIsoStr}' AND time < '${untilIsoStr}'`)
    }
    if (dateIsoStr && type === "previous" && sinceIsoStr && untilIsoStr) {
        conditions.push(`time > '${dateIsoStr}' AND time >= '${sinceIsoStr}' AND time < '${untilIsoStr}'`)
    }
    if (dateIsoStr && type === "previous" && sinceIsoStr && !untilIsoStr) {
        conditions.push(`time > '${dateIsoStr}' AND time >= '${sinceIsoStr}'`)
    }
    if (dateIsoStr && type === "previous" && !sinceIsoStr && untilIsoStr) {
        conditions.push(`time > '${dateIsoStr}' AND time < '${untilIsoStr}'`)
    }
    if (dateIsoStr && type === "next") {
        conditions.push(`time < '${dateIsoStr}'`)
    }
    if (dateIsoStr && type === "previous") {
        conditions.push(`time > '${dateIsoStr}'`)
    }
    if (level) {
        conditions.push(`level = '${level}'`)
    }
    if (service) {
        conditions.push(`service_name = '${service}'`)
    }
    if (q) {
        conditions.push(`message LIKE '%${q}%'`)
    }
    if (attrVal) {
        conditions.push(`attributes->>'${attrKey}' LIKE '${attrVal}'`)
    }
    return conditions.join(" AND ")
}