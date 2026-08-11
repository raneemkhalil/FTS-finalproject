import {z} from "zod";
import {Level} from "./db/queries/logs";

export const logSchema = z.object({
    level: z.enum(Level),
    serviceName: z.string(),
    message: z.string(),
    attributes: z.optional(z.object({
        userId: z.optional(z.string()),
        region: z.optional(z.string())
    }))
})
export type LogReq = z.infer<typeof logSchema>