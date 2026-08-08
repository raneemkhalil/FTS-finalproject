import { db } from '../../index'
import { Request } from "express"
import errors from "../../../errors";
import {tenants, tenantType} from "../../schema";
import {eq} from "drizzle-orm";

export async function getTenant(req: Request) {
    const tenantName = req.header("x-tenant-name")
    if (!tenantName) {
        throw new errors.UnauthorizedError("Invalid Credential");
    }
    const [tenant]: tenantType[] = await db.select().from(tenants).where(eq(tenants.tenantName, tenantName))
    return tenant
}