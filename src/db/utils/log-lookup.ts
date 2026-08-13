import errors from "../../errors";

/**
 * Encodes multiple values into a single web-safe string.
 */
export function createLookupId(time: string, serviceName: string, userId: string, requestId: string): string {
    const rawPayload = `${time}|${serviceName}|${userId}|${requestId}`;
    return Buffer.from(rawPayload, 'utf8').toString('hex');
}

/**
 * Decodes the lookup ID back into individual field values.
 */
export function decodeLookupId(lookupId: string): LogLookup {
    const decoded = Buffer.from(lookupId, 'hex').toString('utf8');
    const [time, serviceName, userId, requestId] = decoded.split('|');

    if (!time || !serviceName || !userId || !requestId) {
        throw new errors.NotFoundError('Invalid lookup ID structure');
    }

    return { time, serviceName, userId, requestId };
}