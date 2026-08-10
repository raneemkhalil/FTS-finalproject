import express from "express";
import errorsHandling from "./middlewares/errors-handling";
import {createUser, getUser} from "./db/queries/users";
import errors from "./errors";
import {makeJWT, makeRefreshToken} from "./utils";
import {config} from "./config";
import {getRefreshToken, revokeRefreshToken, saveRefreshToken} from "./db/queries/refresh-tokens";

const prefix = "/:tenant/api"

export const app = express();
app.use(express.json())

app.get("/", (req: express.Request, res: express.Response) => {
    res.send("<h1 style='text-align: center>Welcome to our server</h1>")
})

app.post(`/api/register`, async (req: express.Request, res: express.Response) => {
    const body: {
        username: string,
        password: string,
        tenantName: string
    } = req.body

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
    if (body.password !== user.password) {
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
    const requiredRefreshToken = req.header("Authorization");
    const tenantName = req.params.tenant as string
    if (!requiredRefreshToken) {
        res.status(400).send("No token provided!");
        return
    }
    const refreshToken = await getRefreshToken(requiredRefreshToken?.split(" ")[1] || "", tenantName)
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
    const requiredRefreshToken = req.header("Authorization");
    const tenantName = req.params.tenant as string
    if (!requiredRefreshToken) {
        res.status(400).send("No token provided!");
        return
    }
    try {
        await revokeRefreshToken(requiredRefreshToken?.split(" ")[1] || " ", tenantName)
    } catch (e) {
        throw e;
    }
    res.status(204).send()
})

// app.get("/logs", (req: express.Request, res: express.Response) => {
//
// })

app.use(errorsHandling)
app.listen(8080, () => {
    console.log("Server running at http://localhost:8080");
});