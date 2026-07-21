/** Per-room serial lock (in-process). Sufficient for single-instance MVP. */
export class RoomLocks {
  private chains = new Map<string, Promise<unknown>>();

  async withLock<T>(roomId: string, fn: () => Promise<T> | T): Promise<T> {
    const prev = this.chains.get(roomId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const next = prev.then(() => gate);
    this.chains.set(roomId, next);
    await prev;
    try {
      return await fn();
    } finally {
      release();
      if (this.chains.get(roomId) === next) {
        this.chains.delete(roomId);
      }
    }
  }
}

export const roomLocks = new RoomLocks();
