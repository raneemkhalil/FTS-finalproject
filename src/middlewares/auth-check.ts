import express from "express";
import {getBearerToken} from "../utils/auth.js";
import {config} from "../config.js";
import errors from "../errors.js";
import {getTenant} from "../db/queries/tenants-queries.js";
import {getApiKey} from "../db/queries/api-keys.js";

export async function authCheck (req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!config.auth_enabled) {
        next()
        return
    }
    if (config.auth_enabled) {
        const [tenantName, token] = getBearerToken(req)
        const tenant = await getTenant(tenantName);
        if (!tenant) {
            throw new errors.UnauthorizedError("Invalid Credential")
        }
        const apiKey = await getApiKey(token, tenantName)
        if (!apiKey) {
            throw new errors.UnauthorizedError("Invalid Credential")
        }
    }
    next()
}