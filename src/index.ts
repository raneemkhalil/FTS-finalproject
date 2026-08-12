import express from "express";
import errorsHandling from "./middlewares/errors-handling";
import {createUser, getUser} from "./db/queries/users";
import errors from "./errors";
import {checkPasswordHash, getBearerToken, hashPassword, makeJWT, makeRefreshToken, validateJWT} from "./utils/auth";
import {config} from "./config";
import {getRefreshToken, revokeRefreshToken, saveRefreshToken} from "./db/queries/refresh-tokens";
import {createLog, getLogs} from "./db/queries/logs";
import {logValidations} from "./utils/log-validations";
import {healthy, healthyCheck} from "./middlewares/healthy-app";
import {LogReq} from "./z-types";
import {pointers, setPointersUrls} from "./utils/set-pointers-urls";


const prefix = "/:tenant/api"

export const app = express();
app.use(express.json())
app.use(healthyCheck)

app.get("/", (req: express.Request, res: express.Response) => {
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

app.post(`/api/register`, async (req: express.Request, res: express.Response) => {
    const body: {
        username: string,
        password: string,
        tenantName: string
    } = req.body

    body.password = await hashPassword(body.password)

    const newUser = await createUser(body, body.tenantName)
    if (!newUser) {
        throw "Something went wrong, please try again!"
    }

    res.status(201).json({
        message: "Successfully registered, please login again.",
        user: newUser
    })
})

app.post(`/api/login`, async (req: express.Request, res: express.Response) => {
    const body: {
        username: string,
        password: string,
        tenantName: string,
    } = req.body
    const tenantName = body.tenantName
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
        accessToken: accessToken,
        refreshToken: refreshTokenIns.token
    })
})

app.post(`${prefix}/refresh`, async (req: express.Request, res: express.Response) => {
    const requiredRefreshToken = getBearerToken(req)
    const tenantName = req.params.tenant as string
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
        'accessToken': token,
    })
})

app.post(`${prefix}/revoke`, async (req: express.Request, res: express.Response) => {
    const requiredRefreshToken = getBearerToken(req)
    const tenantName = req.params.tenant as string
    try {
        await revokeRefreshToken(requiredRefreshToken?.split(" ")[1] || " ", tenantName)
    } catch (e) {
        throw e;
    }
    res.status(204).send()
})

app.get(`${prefix}/logs`, async (req: express.Request, res: express.Response) => {
    const accessToken = getBearerToken(req)
    const tenantName = req.params.tenant as string
    const cursor = req.query.cursor as string
    const limit = req.query.limit as string

    let limitNum = Number(limit)
    let date: Date | null = null
    let type: string = "next"

    if(!limitNum) {
        limitNum = 100
    }
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
            results: []
        })
        return
    }

    // setting prev and next urls in the response data
    setPointersUrls(logs, tenantName, limitNum, type, req.url)

    res.status(200).json({
        next: pointers.next.nextUrl,
        previous: pointers.previous.prevUrl,
        count: logs.length,
        logs: logs,
        next_cursor: pointers.next.cursor
    })
})

app.post(`${prefix}/logs`, async (req: express.Request, res: express.Response) => {
    const tenantName = req.params.tenant as string
    const result = logValidations(req)

    const body: {
        logs: []
    } = req.body
    let logs: LogReq = body.logs;

    if (result.rejected.length > 0) {
        logs = logs.filter((log, index) => !(index in result.count))
    }

    const requestId = crypto.randomUUID()
    const accessToken = getBearerToken(req)

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
app.listen(8080, () => {
    console.log("Server running at http://localhost:8080");
});