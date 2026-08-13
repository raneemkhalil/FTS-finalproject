import * as fs from 'fs';
import * as path from 'path';
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LogAttribute {
    user_id: string;
    region: string;
    retries: number;
    [key: string]: any;
}

interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    service: string;
    message: string;
    attributes: LogAttribute;
}

const total_logs = process.argv[2];

if (!total_logs) {
    console.error("USAGE: npm run generate-logs <number-of-logs>")
    process.exit(1)
}

const TOTAL_LOGS = Number(total_logs)

const OUTPUT_FILE = path.join(__dirname, 'logs.json');

// Sample dataset pools for realistic random generation
const SERVICES = ['checkout', 'auth-service', 'payment-gateway', 'inventory-api', 'user-service', 'notifications'];
const LEVELS: Array<LogEntry['level']> = ['info', 'info', 'info', 'warn', 'error', 'debug'];
const REGIONS = ['eu-west', 'us-east', 'us-west', 'ap-southeast', 'sa-east'];

const MESSAGES: Record<LogEntry['level'], string[]> = {
    info: ['User logged in successfully', 'Order placed', 'Email dispatch queued', 'Session refreshed', 'Cache hit'],
    warn: ['High memory usage detected', 'API response time spike', 'Rate limit threshold near 80%', 'Session expiring soon'],
    error: ['payment declined', 'Database connection timeout', 'Failed to acquire lock on row', 'Unhandled exception in controller'],
    debug: ['Executing query SELECT * FROM users', 'Cache invalidated key: user_42', 'Header payload verified']
};

function getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomTimestamp(): string {
    // Generates timestamps spread across the last 30 days
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const randomTime = getRandomInt(thirtyDaysAgo, now);
    return new Date(randomTime).toISOString();
}

function generateSingleLog(): LogEntry {
    const level = getRandomElement(LEVELS);
    return {
        timestamp: getRandomTimestamp(),
        level: level,
        service: getRandomElement(SERVICES),
        message: getRandomElement(MESSAGES[level]),
        attributes: {
            user_id: String(getRandomInt(1, 10000)),
            region: getRandomElement(REGIONS),
            retries: level === 'error' ? getRandomInt(1, 5) : getRandomInt(0, 1)
        }
    };
}

function generateLogsFile() {
    console.log(`Starting generation of ${TOTAL_LOGS.toLocaleString()} logs...`);
    const writeStream = fs.createWriteStream(OUTPUT_FILE, { flags: 'w', encoding: 'utf8' });

    writeStream.write('{\n  "logs": [\n');

    for (let i = 0; i < TOTAL_LOGS; i++) {
        const log = generateSingleLog();
        const isLast = i === TOTAL_LOGS - 1;

        // Write item formatted with indentation
        const jsonLine = '    ' + JSON.stringify(log) + (isLast ? '' : ',\n');

        writeStream.write(jsonLine);

        // Progress feedback every 2,500 logs
        if ((i + 1) % 2500 === 0) {
            console.log(`Generated ${ (i + 1).toLocaleString() } / ${ TOTAL_LOGS.toLocaleString() } logs...`);
        }
    }

    writeStream.write('\n  ]\n}');
    writeStream.end();

    writeStream.on('finish', () => {
        const stats = fs.statSync(OUTPUT_FILE);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`\nSuccessfully created "${OUTPUT_FILE}" (${fileSizeInMB} MB)`);
    });
}

generateLogsFile();