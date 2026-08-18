export type Journal = {
    entries: {
        idx: number,
        when: number,
        tag: string,
        breakpoints: boolean
    }[]
}
export type LogResponse = {
    id: string,
    timestamp: string | null,
    level: string,
    service: string,
    message: string,
    attributes: unknown
}
export type Healthy = {
    ready: boolean,
    details: Record<string, any>
}
export type SError = {
    code: string,
    path: [number, string],
    message: string
}
export type Detail = {
    index: number,
    reason: string
}
export type Result = {
    accepted: number,
    rejected: {
        index: number,
        reason: string
    }[],
    countRejected: Record<number, number>
}
export type Pointers = {
    next: {
        cursor: string | null,
        nextUrl: string | null,
        type: "next"
    },
    previous: {
        cursor: string | null,
        prevUrl: string | null,
        type: "previous"
    }
}
export type Aggregate = {
    start: string,
    group: string | null
    count: number,
}

export type LogLookup =  {
    time: string;
    serviceName: string;
    requestId: string;
}

