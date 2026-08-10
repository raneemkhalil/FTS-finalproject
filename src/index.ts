import express from "express";
import errorsHandling from "./middlewares/errors-handling";
import {createUser, getUser} from "./db/queries/users";
import errors from "./errors";


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

    res.status(201).json(newUser)
})

app.post(`/api/login`, async (req: express.Request, res: express.Response) => {
    const body: {
        username: string,
        password: string,
        tenantName: string,
    } = req.body
    const user = await getUser(body.username, body.tenantName)
    if (!user) {
        throw "Something went wrong, please try again!"
    }
    if (body.password !== user.password) {
        throw new errors.UnauthorizedError("Invalid username or password")
    }
    res.status(200).json(user)
})

// app.get("/logs", (req: express.Request, res: express.Response) => {
//
// })

app.use(errorsHandling)
app.listen(8080, () => {
    console.log("Server running at http://localhost:8080");
});