import express from "express";
import errorsHandling from "./middlewares/errors-handling";

export const app = express();
app.use(express.json())

app.get("/", (req: express.Request, res: express.Response) => {
    res.send("<h1 style='text-align: center>Welcome to our server</h1>")
})

// app.get("/logs", (req: express.Request, res: express.Response) => {
//
// })

app.use(errorsHandling)
app.listen(8080, () => {
    console.log("Server running at http://localhost:8080");
});