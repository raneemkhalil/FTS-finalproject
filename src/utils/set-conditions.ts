import express from "express";
import errors from "../errors.js";
import {sql} from "drizzle-orm";

export function setConditions(req: express.Request, date: string | null, type: string | null) {
    const level = req.query.level as string
    const service = req.query.service as string
    const q = req.query.q as string

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
    const jsonFilter = JSON.stringify({ [attrKey]: attrVal });

    let conditions = []
    if (!date && sinceIsoStr && untilIsoStr) {
        conditions.push(sql`time >= '${sinceIsoStr}' AND time < '${untilIsoStr}'`)
    }
    if (!date && sinceIsoStr && !untilIsoStr) {
        conditions.push(sql`time >= '${sinceIsoStr}'`)
    }
    if (!date && !sinceIsoStr && untilIsoStr) {
        conditions.push(sql`time < '${untilIsoStr}'`)
    }
    if (date && type === "next" && sinceIsoStr && untilIsoStr) {
        conditions.push(sql`time < '${date}' AND time >= '${sinceIsoStr}' AND time < '${untilIsoStr}'`)
    }
    if (date && type === "next" && sinceIsoStr && !untilIsoStr) {
        conditions.push(sql`time < '${date}' AND time >= '${sinceIsoStr}'`)
    }
    if (date && type === "next" && !sinceIsoStr && untilIsoStr) {
        conditions.push(sql`time < '${date}' AND time < '${untilIsoStr}'`)
    }
    if (date && type === "previous" && sinceIsoStr && untilIsoStr) {
        conditions.push(sql`time > '${date}' AND time >= '${sinceIsoStr}' AND time < '${untilIsoStr}'`)
    }
    if (date && type === "previous" && sinceIsoStr && !untilIsoStr) {
        conditions.push(sql`time > '${date}' AND time >= '${sinceIsoStr}'`)
    }
    if (date && type === "previous" && !sinceIsoStr && untilIsoStr) {
        conditions.push(sql`time > '${date}' AND time < '${untilIsoStr}'`)
    }
    if (date && type === "next") {
        conditions.push(sql`time < '${date}'`)
    }
    if (date && type === "previous") {
        conditions.push(sql`time > '${date}'`)
    }
    if (level) {
        conditions.push(sql`level = '${level}'`)
    }
    if (service) {
        conditions.push(sql`service_name = '${service}'`)
    }
    if (q) {
        conditions.push(sql`message LIKE '%${q}%'`)
    }
    if (attrVal) {
        conditions.push(`attributes @> '${jsonFilter}'::jsonb`)
    }
    return conditions.join(" AND ")
}