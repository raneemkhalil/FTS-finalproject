import express from "express";
import errorsHandling from "./middlewares/errors-handling.js";
import errors from "./errors.js";
import {getBearerToken} from "./utils/auth.js";
import {config} from "./config.js";
import {createLog, getLogByLookup, getLogs, getLogsAggregation} from "./db/queries/logs.js";
import {logValidations} from "./utils/log-validations.js";
import {healthy, healthyCheck} from "./middlewares/healthy-app.js";
import {LogReq} from "./z-types.js";
import {pointers, setPointersUrls} from "./utils/set-pointers-urls.js";
import crypto from "node:crypto";
import {authCheck} from "./middlewares/auth-check.js";


export const app = express();
// Increase JSON body parser limit (default is '100kb')
app.use(express.json({ limit: '50mb' }));

// Increase URL-encoded payload limit if accepting form submissions
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.get(`/`, (req: express.Request, res: express.Response) => {
    if(!healthy.ready) {
        res.status(500).send("<h1 style='text-align: center>Could not lesson to server</h1>")
        return
    }
    res.send("<h1 style='text-align: center>Welcome to our server</h1>")
})

app.get("/health", healthyCheck, (req: express.Request, res: express.Response) => {
    if(!healthy.ready) {
        res.status(500).json(healthy.details)
        return
    }
    res.status(200).json({...healthy.details, info: "Server is ready to listen"})
})

app.get("/logs", authCheck, async (req: express.Request, res: express.Response) => {
    let tenantName = config.default_tenant
    if(config.auth_enabled) {
        [tenantName] = getBearerToken(req)
    }
    const cursor = req.query.cursor as string
    const limit = req.query.limit as string

    let limitNum = limit ? Number(limit) : 100;
    if (isNaN(limitNum)){
        throw new errors.BadRequestError(`Invalid Input: limit is non-numeric`)
    }

    let date: string | null = null
    let type: "next" | "previous" = "next"

    if (limitNum > 1000) {
        throw new errors.BadRequestError("Maximum limit is 1000")
    }

    // check the validation of the cursor if exist
    if (cursor && pointers.previous.cursor !== cursor && pointers.next.cursor !== cursor) {
        throw new errors.BadRequestError("Invalid or malformed cursor!")
    }
    // getting data due to cursor => date and type
    if (cursor) {
        date = pointers.previous.cursor === cursor ? pointers.previous.date : pointers.next.date
        type = pointers.previous.cursor === cursor ? pointers.previous.type : pointers.next.type
    }

    let logs = await getLogs(date, type, limitNum + 1, tenantName, req)

    if (!logs[0]) {
        res.status(200).json({
            next: null,
            previous: null,
            count: 0,
            logs: [],
            next_cursor: null
        })
        return
    }

    // setting prev and next urls in the response data
    setPointersUrls(logs, limitNum, type, req.url)

    res.status(200).json({
        next: pointers.next.nextUrl,
        previous: pointers.previous.prevUrl,
        count: logs.length,
        logs: logs,
        next_cursor: pointers.next.cursor
    })
})

app.get("/logs/aggregate", authCheck, async (req: express.Request, res: express.Response) => {
    let tenant = config.default_tenant
    if(config.auth_enabled) {
        [tenant] = getBearerToken(req)
    }
    let results = await getLogsAggregation(req, tenant)
    res.status(200).json({
        buckets: results
    })
})

app.get("/logs/:id", authCheck, async (req: express.Request, res: express.Response) => {
    let tenantName = config.default_tenant
    if(config.auth_enabled) {
        [tenantName] = getBearerToken(req)
    }
    const id = req.params.id as string
    const log = await getLogByLookup(id, tenantName)

    res.status(200).json(log)
})

app.post("/logs", authCheck, async (req: express.Request, res: express.Response) => {
    let tenantName = config.default_tenant
    if(config.auth_enabled) {
        [tenantName] = getBearerToken(req)
    }
    const result = logValidations(req)

    const body: {
        logs: []
    } = req.body
    let logs: LogReq = body.logs;

    if (result.rejected.length > 0) {
        logs = logs.filter((log, index) => !(index in result.count))
    }

    const requestId = crypto.randomUUID()

    await createLog(requestId, logs, tenantName)
    res.status(200).json({
        accepted: result.accepted,
        rejected: result.rejected
    })
})

app.use(errorsHandling)
app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
});