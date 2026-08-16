import {ApiKeys, apiKeysTable} from "../schema.js";
import {db} from "../index.js";
import {eq} from "drizzle-orm";

export async function createApiKey(tenantName: string, token: string) {
    const apiKeys = apiKeysTable(tenantName);

    const createdDate = new Date();
    const [res]: ApiKeys[] = await db.insert(apiKeys).values({
        createdAt: createdDate,
        token: token,
    }).returning().onConflictDoNothing()

    return res
}

export async function getApiKey(token: string, tenantName: string) {
    const apiKey = apiKeysTable(tenantName)
    const [apiKeyIns]: ApiKeys[] = await db.select().from(apiKey).where(eq(apiKey.token, token))
    return apiKeyIns
}
//
// export async function revokeRefreshToken(token: string, tenantName: string) {
//     const refreshTokens = refreshTokensTable(tenantName)
//     try {
//         await db.update(refreshTokens).set({
//             revokedAt: new Date()
//         }).where(eq(refreshTokens.token, token))
//     } catch (e) {
//         throw "There is problem in revoking refresh token"
//     }
// }