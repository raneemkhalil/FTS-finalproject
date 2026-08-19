import {refine, z} from "zod";
import { DateTime } from 'luxon';
import {Level} from "./db/queries/logs.js";


export const isoTimestamp = z.string().refine((s) => {
    // strict ISO check; accepts e.g. 2023-08-01T12:34:56Z or with offset
    const dt = DateTime.fromISO(s, { setZone: true });
    const maxDateAllowed = DateTime.utc().plus({minutes: 5})
    const validDate = dt <= maxDateAllowed
    return dt.isValid && validDate;
}, { message: 'timestamp must be a valid ISO 8601 string and not more future than 5 min.' });

const specific = refine(i => {
    if (typeof i === "object" && i !== null) {
        const values = Object.values(i)
        let bool = true
        for (let value of values) {
            bool = typeof value === "number" || typeof value === "string" || typeof value === "boolean"
            if (!bool) {
                return bool
            }
        }
        return bool
    }
    return typeof i === "undefined"

}, { message: 'Invalid attributes' })

export const logSchema = z.array(z.object({
    timestamp: isoTimestamp,
    level: z.enum(Level),
    service: z.string().nonempty(),
    message: z.string().nonempty(),
    attributes: specific
}))

export type LogReq = z.infer<typeof logSchema>