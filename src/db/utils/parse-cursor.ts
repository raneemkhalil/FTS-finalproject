export function encodeCursor(time: string, type: string): string {
    return Buffer.from(`${type}|${time}`, 'utf-8').toString('hex');
}

export function decodeCursor(cursorHex: string): [string | null, string | null] {
    try {
        if (!cursorHex || typeof cursorHex !== 'string') {
            return [null, null];
        }

        // 1. Convert hex back to UTF-8 text
        let [type, isoTime] = Buffer.from(cursorHex, 'hex').toString('utf-8').split("|");

        if (!isoTime) {
            return [null, null]
        }

        // 3. Validate timestamp parsing
        const time = new Date(isoTime);
        if (isNaN(time.getTime())) {
            return [null, null];
        }

        return [time.toISOString(), type];
      } catch (error) {
        // Return null on any parsing errors to let the caller handle the 400 response
        return [null, null];
      }
}