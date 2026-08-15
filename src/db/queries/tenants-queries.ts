import { db } from '../index.js'
import { Request } from "express"
import errors from "../../errors.js";
import {tenants, Tenant} from "../schema.js";
import {eq} from "drizzle-orm";

export async function getTenant(req: Request) {
    const tenantName = req.header("x-tenant-name")
    if (!tenantName) {
        throw new errors.UnauthorizedError("Invalid Credential");
    }
    const [tenant]: Tenant[] = await db.select().from(tenants).where(eq(tenants.tenantName, tenantName))
    return tenant
}