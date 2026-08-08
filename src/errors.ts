export class UnAuthorization extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class Forbidden extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class BadRequest extends Error {
    constructor(message: string) {
        super(message);
    }
}