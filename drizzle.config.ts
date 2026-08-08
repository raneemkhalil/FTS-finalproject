import { defineConfig } from "drizzle-kit";
import { config } from "./src/config";

export default defineConfig({
    schema: "src/db/schema.ts",
    out: config.migrationsConfig.migrationsFolder,
    dialect: "postgresql",
    dbCredentials: config.dbCredential,
});