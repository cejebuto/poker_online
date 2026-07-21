/** Domain error with stable machine code. */
export type GameError = {
    code: string;
    message: string;
};
/** Discriminated result for pure domain operations. */
export type Result<T, E = GameError> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: E;
};
export declare function ok<T>(value: T): Result<T, never>;
export declare function err<E>(error: E): Result<never, E>;
//# sourceMappingURL=result.d.ts.map