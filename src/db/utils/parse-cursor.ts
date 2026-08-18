export function encodeCursor(time: string): string {
    return Buffer.from(time, 'utf-8').toString('hex');
}

export function decodeCursor(cursorHex: string): string | null {
    try {
        if (!cursorHex || typeof cursorHex !== 'string') {
            return null;
        }

        // 1. Convert hex back to UTF-8 text
        const isoTime = Buffer.from(cursorHex, 'hex').toString('utf-8');

        if (!isoTime) {
            return null
        }

        // 3. Validate timestamp parsing
        const time = new Date(isoTime);
        if (isNaN(time.getTime())) {
            return null;
        }

        return time.toISOString();
      } catch (error) {
        // Return null on any parsing errors to let the caller handle the 400 response
        return null;
      }
}