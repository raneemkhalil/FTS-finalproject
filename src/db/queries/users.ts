import {User, usersTable} from "../schema.js";
import {db} from "../index.js";
import {eq} from "drizzle-orm";


export async function createUser(user: User, tenantName: string) {
    const users = usersTable(tenantName)
    let res: User;
    try {
        [res] = await db.insert(users).values(user).onConflictDoNothing().returning()
    } catch (e) {
        console.log(e)
        throw "Couldn't create a user"
    }
    return res
}

export async function getUserById(userId: string, tenantName: string) {
    const users = usersTable(tenantName)
    const [res] = await db.select().from(users).where(eq(users.id, userId))
    return res
}

export async function getUser(username: string, tenantName: string) {
    const users = usersTable(tenantName)
    const [res] = await db.select().from(users).where(eq(users.username, username))
    return res
}