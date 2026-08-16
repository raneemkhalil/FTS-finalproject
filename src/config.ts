import dotenv from "dotenv"

dotenv.config()

const secret = process.env.SECRET
const port = process.env.PORT
const host = process.env.HOST
const auth_enabled = process.env.AUTH_ENABLED
const loadgen_api_key = process.env.LOADGEN_API_KEY


const dbCredential = {
    host: host ? host : "localhost",
    user: "postgres",
    password: "1234",
    port: 5432,
    database: "logs"
}

const migrationsConfig = {
    migrationsFolder: "src/db/migrations"
}

export let config = {
    dbCredential: dbCredential,
    migrationsConfig: migrationsConfig,
    secret: secret,
    port: port,
    token: loadgen_api_key ? loadgen_api_key : "",
    auth_enabled: auth_enabled === "true",
    default_tenant: "default"
}