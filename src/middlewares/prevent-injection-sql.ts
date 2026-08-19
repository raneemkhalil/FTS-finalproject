import errors from "../errors.js";
import express from "express";

export function preventInjectionSQL(req: express.Request, res: express.Response, next: express.NextFunction) {

    const queries = Object.entries(req.query)

    for (let [key, val] of queries) {
        if (key.startsWith("attr.")) {
            let attrKey = key.split(".")[1]
            // Reject key names with illegal characters to prevent SQL path injection
            // Allows alphanumeric characters, underscores, and dots (e.g., attr.user_id, attr.meta.role)
            if (!/^[a-zA-Z0-9_\-\.]+$/.test(attrKey)) {
                throw new errors.BadRequestError(`Invalid attribute key format: '${attrKey}'`);
            }
            if (!/^[a-zA-Z0-9_\-\.]+$/.test(val as string)) {
                throw new errors.BadRequestError(`Invalid attribute key format: '${val}'`);
            }
        }
    }
    next()
}