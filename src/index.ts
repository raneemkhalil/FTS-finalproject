import express from "express";
import errorsHandling from "./middlewares/errors-handling";
import {createUser, getUser} from "./db/queries/users";
import errors from "./errors";
import {checkPasswordHash, getBearerToken, hashPassword, makeJWT, makeRefreshToken, validateJWT} from "./utils/auth";
import {config} from "./config";
import {getRefreshToken, revokeRefreshToken, saveRefreshToken} from "./db/queries/refresh-tokens";
import {createLog, getLogByLookup, getLogs, getLogsAggregation} from "./db/queries/logs";
import {logValidations} from "./utils/log-validations";
import {healthy, healthyCheck} from "./middlewares/healthy-app";
import {LogReq} from "./z-types";
import {pointers, setPointersUrls} from "./utils/set-pointers-urls";
import crypto from "node:crypto";
import {migrateEachTenant} from "./db/scripts/migrate-schemas";
import {db} from "./db";

export const app = express();
// Increase JSON body parser limit (default is '100kb')
app.use(express.json({ limit: '50mb' }));

// Increase URL-encoded payload limit if accepting form submissions
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(healthyCheck)

app.get(`/`, (req: express.Request, res: express.Response) => {
    if(!healthy.ready) {
        res.status(500).send("<h1 style='text-align: center>Could not lesson to server</h1>")
        return
    }
    res.send("<h1 style='text-align: center>Welcome to our server</h1>")
})

app.get("/health", (req: express.Request, res: express.Response) => {
    if(!healthy.ready) {
        res.status(500).json(healthy.details)
        return
    }
    res.status(200).json({...healthy.details, info: "Server is ready to listen"})
})

app.post("/register", async (req: express.Request, res: express.Response) => {
    const body: {
        username: string,
        password: string,
        tenantName?: string
    } = req.body

    const tenantName = body.tenantName || body.username

    try {
        await migrateEachTenant(db, tenantName)
        console.log(`Tenant created: name="${tenantName}", schema="${tenantName}"`);
    } catch (err) {
        console.error("Failed to create tenant:", err);
        throw err;
    }

    body.password = await hashPassword(body.password)

    const newUser = await createUser(body, tenantName)
    if (!newUser) {
        throw "Something went wrong, please try again!"
    }

    res.status(201).json({
        message: "Successfully registered, please login again.",
        username: newUser.username
    })
})

app.post("/login", async (req: express.Request, res: express.Response) => {
    const body: {
        username: string,
        password: string,
        tenantName?: string,
    } = req.body
    const tenantName = body.tenantName || body.username
    const user = await getUser(body.username, tenantName)
    if (!user) {
        throw "Something went wrong, please try again!"
    }
    if (!await checkPasswordHash(body.password, user.password)) {
        throw new errors.UnauthorizedError("Invalid username or password")
    }
    if (!config.secret) {
        throw "Empty secret"
    }
    const refreshToken = makeRefreshToken();
    const refreshTokenIns = await saveRefreshToken(user.id, tenantName, refreshToken)
    const accessToken = makeJWT(user.id, 3600, config.secret)

    res.status(200).json({
        username: user.username,
        token: tenantName + " " + accessToken,
        refresh_token: tenantName + " " + refreshTokenIns.token
    })
})

app.post("/refresh", async (req: express.Request, res: express.Response) => {
    const [tenantName, requiredRefreshToken] = getBearerToken(req)
    const refreshToken = await getRefreshToken(requiredRefreshToken, tenantName)
    const date = new Date();
    if (!refreshToken || refreshToken.expiresAt < date || refreshToken.revokedAt !== null) {
        res.status(401).send()
        return
    }
    if (!config.secret) {
        throw "Empty secret"
    }
    const token = makeJWT(refreshToken.userId || "", 3600, config.secret)
    res.status(200).json({
        token: tenantName + " " + token,
    })
})

app.post("/revoke", async (req: express.Request, res: express.Response) => {
    const [tenantName, requiredRefreshToken] = getBearerToken(req)
    try {
        await revokeRefreshToken(requiredRefreshToken, tenantName)
    } catch (e) {
        throw e;
    }
    res.status(204).send()
})

app.get("/logs", async (req: express.Request, res: express.Response) => {
    const [tenantName, accessToken] = getBearerToken(req)
    const cursor = req.query.cursor as string
    const limit = req.query.limit as string

    let limitNum = limit ? Number(limit) : 100;
    if (isNaN(limitNum)){
        throw new errors.BadRequestError(`Invalid Input: limit is non-numeric`)
    }

    let date: string | null = null
    let type: "next" | "previous" | undefined = "next"

    if (limitNum > 1000) {
        throw new errors.BadRequestError("Maximum limit is 1000")
    }

    if(!config.secret) {
        throw "Empty secret!"
    }
    try {
       validateJWT(accessToken, config.secret)
    } catch (e) {
        throw new errors.UnauthorizedError("Invalid or expired token!")
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

app.get("/logs/aggregate", async (req: express.Request, res: express.Response) => {
    const [tenant, accessToken] = getBearerToken(req)
    if(!config.secret) {
        throw "Empty secret!"
    }
    try {
       validateJWT(accessToken, config.secret)
    } catch (e) {
        throw new errors.UnauthorizedError("Invalid or expired token!")
    }
    let results = await getLogsAggregation(req, tenant)
    res.status(200).json({
        buckets: results
    })
})

app.get("/logs/:id", async (req: express.Request, res: express.Response) => {
    const [tenantName, accessToken] = getBearerToken(req)
    const id = req.params.id as string

    if (!config.secret) {
        throw "Empty secret!"
    }
    try {
        validateJWT(accessToken, config.secret)
    } catch (e) {
        throw new errors.UnauthorizedError("Invalid or expired token!")
    }
    const log = await getLogByLookup(id, tenantName)

    res.status(200).json(log)
})

app.post("/logs", async (req: express.Request, res: express.Response) => {
    const [tenantName, accessToken] = getBearerToken(req)
    const result = logValidations(req)

    const body: {
        logs: []
    } = req.body
    let logs: LogReq = body.logs;

    if (result.rejected.length > 0) {
        logs = logs.filter((log, index) => !(index in result.count))
    }

    const requestId = crypto.randomUUID()

    let userId: string

    if(!config.secret) {
        throw "Empty secret!"
    }
    try {
       userId = validateJWT(accessToken, config.secret)
    } catch (e) {
        throw new errors.UnauthorizedError("Invalid or expired token!")
    }

    await createLog(userId, requestId, logs, tenantName)
    res.status(200).json({
        accepted: result.accepted,
        rejected: result.rejected
    })
})

app.use(errorsHandling)
app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
});