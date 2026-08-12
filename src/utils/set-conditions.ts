import express from "express";

export function setConditions(req: express.Request, date: Date | null, type: string) {
    const level = req.query.level as string
    const service = req.query.service as string
    const q = req.query.q as string
    const since = req.query.since ? new Date(req.query.since as string) : undefined;
    const until = req.query.until ? new Date(req.query.until as string) : undefined;

    const queries = Object.keys(req.query)
    let attrKey = queries.find((value) => value.includes("attr")) || ""
    let attrVal = req.query[attrKey] as string
    attrKey = attrKey.split(".")[1]

    let conditions: string[] = []
    if (!date && since && until) {
        conditions.push(`time >= '${since.toISOString()}' AND time < '${until.toISOString()}'`)
    }
    if (!date && since && !until) {
        conditions.push(`time >= '${since.toISOString()}'`)
    }
    if (!date && !since && until) {
        conditions.push(`time < '${until.toISOString()}'`)
    }
    if (date && type === "next" && since && until) {
        conditions.push(`time < '${date.toString()}' AND time >= '${since.toISOString()}' AND time < '${until.toISOString()}'`)
    }
    if (date && type === "next" && since && !until) {
        conditions.push(`time < '${date.toString()}' AND time >= '${since.toISOString()}'`)
    }
    if (date && type === "next" && !since && until) {
        conditions.push(`time < '${date.toString()}' AND time < '${until.toISOString()}'`)
    }
    if (date && type === "previous" && since && until) {
        conditions.push(`time > '${date.toString()}' AND time >= '${since.toISOString()}' AND time < '${until.toISOString()}'`)
    }
    if (date && type === "previous" && since && !until) {
        conditions.push(`time > '${date.toString()}' AND time >= '${since.toISOString()}'`)
    }
    if (date && type === "previous" && !since && until) {
        conditions.push(`time > '${date.toString()}' AND time < '${until.toISOString()}'`)
    }
    if (date && type === "next") {
        conditions.push(`time < '${date.toString()}'`)
    }
    if (date && type === "previous") {
        conditions.push(`time > '${date.toString()}'`)
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