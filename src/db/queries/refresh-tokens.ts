import {RefreshToken, refreshTokensTable} from "../schema.js";
import {db} from "../index.js";
import {eq} from "drizzle-orm";

export async function saveRefreshToken(userId: string, tenantName: string, token: string) {
    const createdDate = new Date();
    const expiresDate = new Date();

    expiresDate.setDate(createdDate.getDate() + 60);

    const refreshTokens = refreshTokensTable(tenantName);
    let [res]: RefreshToken[] = await db.select().from(refreshTokens).where(eq(refreshTokens.userId, userId));

    if (!res) {
        [res] = await db.insert(refreshTokens).values({
            createdAt: createdDate,
            token: token,
            userId: userId,
            expiresAt: expiresDate
        }).returning()
    }
    if (res && res.expiresAt < createdDate && !res.revokedAt) {
        [res] = await db.update(refreshTokens).set({
            token: token,
            expiresAt: expiresDate
        }).returning()
    }
    return res
}

export async function getRefreshToken(token: string, tenantName: string) {
    const refreshTokens = refreshTokensTable(tenantName)
    const [refreshToken]: RefreshToken[] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token))
    return refreshToken
}

export async function revokeRefreshToken(token: string, tenantName: string) {
    const refreshTokens = refreshTokensTable(tenantName)
    try {
        await db.update(refreshTokens).set({
            revokedAt: new Date()
        }).where(eq(refreshTokens.token, token))
    } catch (e) {
        throw "There is problem in revoking refresh token"
    }
}