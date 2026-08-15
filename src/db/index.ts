import { drizzle } from "drizzle-orm/postgres-js"
import { config } from "../config.js";
import * as schema from "./schema.js"
import postgres from "postgres";

const connection = postgres(config.dbCredential)
export const db = drizzle(connection, { schema })
export type dbType = typeof db