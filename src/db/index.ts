import { drizzle } from "drizzle-orm/postgres-js"
import { config } from "../config";
import * as schema from "./schema"
import postgres from "postgres";

const connection = postgres(config.dbCredential)
export const db = drizzle(connection, { schema })
export type dbType = typeof db