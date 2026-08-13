import errors from "../errors";
import express from "express";
import jwt, { JwtPayload } from 'jsonwebtoken'
import crypto from "node:crypto";
import * as argon2 from "argon2";

type payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">

export function makeJWT(userID: string, expiresIn: number, secret: string): string {
    const iat = Math.floor(Date.now() / 1000);
    return jwt.sign({
        iss: "chirpy",
        sub: userID,
        iat: iat,
        exp: iat + expiresIn,
    }, secret, {})
}

export function validateJWT(tokenString: string, secret: string): string {
    let payloadDet = jwt.verify(tokenString, secret)
    if (typeof payloadDet === "string") {
        return payloadDet;
    }
    return payloadDet.sub || ""
}

export function getBearerToken(req: express.Request) {
    const bearerToken = req.header("Authorization")
    if (!bearerToken) throw new errors.UnauthorizedError("No token provided");
    let bearerTokenArr = bearerToken.split(" ")
    return [bearerTokenArr[1], bearerTokenArr[2]]
}

export function makeRefreshToken() {
    return crypto.randomBytes(32).toString("hex")
}

export async function hashPassword(password: string): Promise<string> {
    let hashedPassword;
    try {
        hashedPassword = await argon2.hash(password);
    } catch (e) {
        throw e;
    }
    return hashedPassword;
}

export async function checkPasswordHash(password: string, hash: string): Promise<boolean>  {
    return await argon2.verify(hash, password);
}