/**
 * Shared WebSocket event contracts.
 * api and web import these types — never redefine them locally.
 */
export type WsClientEvent = {
    type: 'ping';
    requestId?: string;
} | {
    type: 'session:resume';
    token: string;
};
export type WsServerEvent = {
    type: 'pong';
    requestId?: string;
    ts: number;
} | {
    type: 'error';
    code: string;
    message: string;
} | {
    type: 'session:resumed';
    roomId: string;
    playerId: string;
};
export type HealthResponse = {
    status: 'ok' | 'degraded' | 'error';
    postgres?: 'up' | 'down';
    redis?: 'up' | 'down';
};
//# sourceMappingURL=events.d.ts.map