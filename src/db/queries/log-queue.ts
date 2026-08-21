import { LogReq } from "../../z-types.js";
import {config} from "../../config.js";
import postgres from "postgres";

interface QueuedLog {
    tenant: string
    requestId: string;
    level: string;
    service: string;
    timestamp: Date;
    message: string;
    attributes: Record<string, any>;
}
// Connection instance
const sql = postgres(config.dbCredential);

class LogQueue {
    private queue: QueuedLog[] = [];
    private isFlushing = false;
    private readonly BATCH_SIZE = 3000;
    private readonly FLUSH_INTERVAL_MS = 10; // Flush every 10ms or when batch size reached

    constructor() {
        this.startTimer();
    }

    private startTimer() {
        setInterval(() => this.flush(), this.FLUSH_INTERVAL_MS);
    }

    public push(requestId: string, logs: LogReq, tenant: string) {
        for (const item of logs) {
            const parsedDate = new Date(item.timestamp);
            this.queue.push({
                tenant,
                requestId,
                level: item.level || 'info',
                service: item.service || 'unknown',
                timestamp: !isNaN(parsedDate.getTime()) ? parsedDate : new Date(),
                message: item.message || '',
                attributes: item.attributes || {}
            });
        }
        if (this.queue.length >= this.BATCH_SIZE && !this.isFlushing) {
            this.flush();
        }
    }

    private async flush() {
        if (this.queue.length === 0 || this.isFlushing)
            return;
        this.isFlushing = true
        // Drain current queue
        const batch = this.queue.splice(0, this.BATCH_SIZE);
        // Group by tenant
        const tenantBatches = new Map<string, QueuedLog[]>();
        for (const log of batch) {
            const list = tenantBatches.get(log.tenant) || [];
            list.push(log);
            tenantBatches.set(log.tenant, list);
        }
        // Insert in bulk
        for (const [tenant, items] of tenantBatches.entries()) {
            // Note: Column names in objects MUST match database column names exactly
            const formattedRows = items.map(item => ({
                request_id: item.requestId,
                level: item.level,
                service_name: item.service,
                time: item.timestamp,
                message: item.message,
                attributes: JSON.stringify(item.attributes || {})
            }));
            try {
                await sql`                                                                                                                               
                    INSERT INTO ${sql(`${tenant}.logs`)} ${sql(                                                                                          
                        formattedRows,                                                                                                                   
                        'request_id',                                                                                                                    
                        'level',                                                                                                                         
                        'service_name',                                                                                                                  
                        'time',                                                                                                                          
                        'message',                                                                                                                       
                        'attributes'                                                                                                                     
                    )}                                                                                                                                   
                    ON CONFLICT DO NOTHING                                                                                                               
                `;
            }
            catch (err) {
                console.error(`Bulk write failed for tenant ${tenant}:`, err);
            }
        }
        this.isFlushing = false
        if (this.queue.length >= this.BATCH_SIZE) {
            setImmediate(() => this.flush());
        }
    }
}

export const logQueue = new LogQueue();