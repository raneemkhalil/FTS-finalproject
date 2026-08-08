import * as process from "node:process";
import {migrateTenant} from "../../migrate-tenants.ts";

export async function createTenant(schemaName: string) {
    try {
        await migrateTenant(schemaName)
        console.log(`Tenant created: name="${schemaName}", schema="${schemaName}"`);
    } catch (err) {
        console.error("Failed to create tenant:", err);
        throw err;
    }
}

const tenantName = process.argv[2]
if (!tenantName) {
    console.error("Usage: npm run create-tenant -- <tenantName>")
    process.exit(1)
}

createTenant(tenantName).catch(() => process.exit(1))
