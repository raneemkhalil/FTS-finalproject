import { db } from '../index'
import { Request } from "express"
import errors from "../../errors";
import {tenants, Tenant} from "../schema";
import {eq} from "drizzle-orm";

export async function tenantsQueries(req: Request) {
    const tenantName = req.header("x-tenant-name")
    if (!tenantName) {
        throw new errors.UnauthorizedError("Invalid Credential");
    }
    const [tenant]: Tenant[] = await db.select().from(tenants).where(eq(tenants.tenantName, tenantName))
    return tenant
}