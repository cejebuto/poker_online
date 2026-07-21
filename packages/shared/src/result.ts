/** Domain error with stable machine code. */
export type GameError = {
  code: string;
  message: string;
};

/** Discriminated result for pure domain operations. */
export type Result<T, E = GameError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
