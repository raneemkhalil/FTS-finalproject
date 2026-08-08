const dbCredential = {
    host: "localhost",
    user: "postgres",
    password: "1234",
    port: 5432,
    database: "logs"
}

const migrationsConfig = {
    migrationsFolder: "src/db/migrations"
}

export const config = {
    dbCredential: dbCredential,
    migrationsConfig: migrationsConfig
}