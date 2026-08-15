import errors from "../../errors.js";

export function parseEpoch(bucket: string) {
    const regex = /^(\d+)(m|h|d)$/;
    const match = bucket.match(regex);
    if (!match) {
        throw new errors.BadRequestError("Invalid bucket");
    }
    switch (match[2]) {
        case "h":
            return 60 * 60 * parseInt(match[1]);
        case "d":
            return 60 * 60 * 24 * parseInt(match[1]);
        default:
            return 60 * parseInt(match[1]);
    }
}