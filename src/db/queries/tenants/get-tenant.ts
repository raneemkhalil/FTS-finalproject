import { db } from '../../index'
import { Request } from "express"
import {UnAuthorization} from "../../../errors.ts";
import {tenants, tenantType} from "../../schema.ts";
import {eq} from "drizzle-orm";

export async function getTenant(req: Request) {
    const tenantName = req.header("tenant_name")
    if (!tenantName) {
        throw new UnAuthorization("Invalid Credential");
    }
    const [tenant]: tenantType[] = await db.select().from(tenants).where(eq(tenants.tenantName, tenantName))
    return tenant
}