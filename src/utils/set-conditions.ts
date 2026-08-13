import express from "express";
import errors from "../errors";
import {Level} from "../db/queries/logs";

export function setConditions(req: express.Request, date: string | null, type: string | null) {
    const level = req.query.level as string
    const service = req.query.service as string
    const q = req.query.q as string

    if (level && level !== Level.DEBUG && level !== Level.ERROR && level !== Level.INFO && level !== Level.WARN) {
        throw new errors.BadRequestError("Level must be one of these values [error, debug, info, warn].")
    }

    const since = req.query.since ? new Date(req.query.since as string) : undefined;
    const until = req.query.until ? new Date(req.query.until as string) : undefined;

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
    if (!date && sinceIsoStr && untilIsoStr) {
        conditions.push(`time >= '${sinceIsoStr}' AND time < '${untilIsoStr}'`)
    }
    if (!date && sinceIsoStr && !untilIsoStr) {
        conditions.push(`time >= '${sinceIsoStr}'`)
    }
    if (!date && !sinceIsoStr && untilIsoStr) {
        conditions.push(`time < '${untilIsoStr}'`)
    }
    if (date && type === "next" && sinceIsoStr && untilIsoStr) {
        conditions.push(`time < '${date}' AND time >= '${sinceIsoStr}' AND time < '${untilIsoStr}'`)
    }
    if (date && type === "next" && sinceIsoStr && !untilIsoStr) {
        conditions.push(`time < '${date}' AND time >= '${sinceIsoStr}'`)
    }
    if (date && type === "next" && !sinceIsoStr && untilIsoStr) {
        conditions.push(`time < '${date}' AND time < '${untilIsoStr}'`)
    }
    if (date && type === "previous" && sinceIsoStr && untilIsoStr) {
        conditions.push(`time > '${date}' AND time >= '${sinceIsoStr}' AND time < '${untilIsoStr}'`)
    }
    if (date && type === "previous" && sinceIsoStr && !untilIsoStr) {
        conditions.push(`time > '${date}' AND time >= '${sinceIsoStr}'`)
    }
    if (date && type === "previous" && !sinceIsoStr && untilIsoStr) {
        conditions.push(`time > '${date}' AND time < '${untilIsoStr}'`)
    }
    if (date && type === "next") {
        conditions.push(`time < '${date}'`)
    }
    if (date && type === "previous") {
        conditions.push(`time > '${date}'`)
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