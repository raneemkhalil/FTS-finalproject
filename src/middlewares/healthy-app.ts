import {checkDbConnection, checkMigrations, Status} from "../utils/healthness.js";
import express from "express";
import {Healthy} from "../types.js";

export let healthy : Healthy = {
    ready: true,
    details: {}
}

export async function healthyCheck(req: express.Request, res: express.Response, next: express.NextFunction) {
    const names = ["db", "migration"]
    const results = await Promise.allSettled([checkDbConnection(), checkMigrations()])

    results.forEach((res, index) => {
        if (res.status === "fulfilled") {
            healthy.details[names[index]] = res.value as { status: Status, message?: string }
            healthy.ready = res.value.status === Status.SUCCESS
        } else {
            healthy.details[names[index]] = {
                status: Status.FAILED,
                message: res.reason?.message
            }
            healthy.ready = false
        }
    })
    next()
}