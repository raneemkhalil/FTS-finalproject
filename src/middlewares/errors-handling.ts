import express from "express";
import errors from "../errors";

export default function errorsHandling (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) {
    if (err instanceof errors.UnauthorizedError) {
        res.status(401).send(err.message)
    } else if (err instanceof errors.ForbiddenError) {
        res.status(403).send(err.message)
    } else if (err instanceof errors.BadRequestError) {
        res.status(400).send(err.message)
    } else if (err instanceof errors.NotFoundError) {
        res.status(404).send(err.message)
    } else {
        res.status(500).send(err.message)
    }
    next()
}