import errors from "./errors";
import express from "express";
import jwt, { JwtPayload } from 'jsonwebtoken'
import crypto from "node:crypto";

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
    return bearerToken.split(" ")[1];
}

export function getAPIKey(req: express.Request) {
    const APIKey = req.header("Authorization")
    if (!APIKey) throw new errors.UnauthorizedError("No token provided");
    return APIKey.split(" ")[1];
}

export function makeRefreshToken() {
    return crypto.randomBytes(32).toString("hex")
}