type Journal = {
    entries: {
        idx: number,
        when: number,
        tag: string,
        breakpoints: boolean
    }[]
}
type LogResponse = {
    id: string,
    timestamp: string | null,
    level: string,
    service: string,
    message: string,
    attributes: unknown
}
type Healthy = {
    ready: boolean,
    details: Record<string, any>
}
type SError = {
    code: string,
    path: [number, string],
    message: string
}
type Detail = {
    index: number,
    reason: string
}
type result = {
    accepted: number,
    rejected: {
        index: number,
        reason: string
    }[],
    count: Record<number, number>
}
type Pointers = {
    next: {
        cursor: string | null,
        date: string | null,
        nextUrl: string | null,
        type: "next"
    },
    previous: {
        cursor: string | null,
        date: string | null,
        prevUrl: string | null,
        type: "previous"
    }
}
type Aggregate = {
    start: string,
    group: string | null
    count: number,
}

type LogLookup =  {
    time: string;
    serviceName: string;
    userId: string | number;
    requestId: string;
}

