import express from "express";
import errorsHandling from "./middlewares/errors-handling.js";
import {getBearerToken} from "./utils/auth.js";
import {config} from "./config.js";
import {getLogByLookup, getLogs, getLogsAggregation} from "./db/queries/logs.js";
import {logValidations} from "./middlewares/log-validations.js";
import {healthy, healthyCheck} from "./middlewares/healthy-app.js";
import {LogReq} from "./z-types.js";
import {pointers, setPointersUrls} from "./utils/set-pointers-urls.js";
import crypto from "node:crypto";
import {authCheck} from "./middlewares/auth-check.js";
import {paramValidations} from "./middlewares/param-validations.js";
import {decodeCursor} from "./db/utils/parse-cursor.js";
import {preventInjectionSQL} from "./middlewares/prevent-injection-sql.js";
import {logQueue} from "./db/queries/log-queue.js";


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

app.get("/logs", authCheck, preventInjectionSQL, paramValidations, async (req: express.Request, res: express.Response) => {
    let tenantName = config.default_tenant
    if(config.auth_enabled) {
        [tenantName] = getBearerToken(req)
    }
    const cursor = req.query.cursor as string
    let limit = req.query.limit as string ?? 100

    let date: string | null = null
    let type: "next" | "previous" = "next"

    // getting data due to cursor => date and type
    if (cursor) {
        date = decodeCursor(cursor)
        type = pointers.previous.cursor === cursor ? pointers.previous.type : pointers.next.type
    }

    let logs = await getLogs(date, type, Number(limit) + 1, tenantName, req)

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
    setPointersUrls(logs, Number(limit), type, req.url)

    res.status(200).json({
        next: pointers.next.nextUrl,
        previous: pointers.previous.prevUrl,
        count: logs.length,
        logs: logs,
        next_cursor: pointers.next.cursor
    })
})

app.get("/logs/aggregate", authCheck, preventInjectionSQL, paramValidations, async (req: express.Request, res: express.Response) => {
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

app.post("/logs", authCheck, logValidations, async (req: express.Request, res: express.Response) => {
    let tenantName = config.default_tenant
    if(config.auth_enabled) {
        [tenantName] = getBearerToken(req)
    }

    const body: {
        logs: []
    } = req.body
    let logs: LogReq = body.logs;

    const requestId = crypto.randomUUID()

    if (Object.keys(res.locals.validationResult.countRejected).length > 0) {
        logs = logs.filter((_, index) => !(index in res.locals.validationResult.countRejected))
    }

    // Push into queue asynchronously without awaiting database
    logQueue.push(requestId, logs, tenantName);
    res.status(200).json({
        accepted: res.locals.validationResult.accepted,
        rejected: res.locals.validationResult.rejected
    })
})

app.use(errorsHandling)
app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
});