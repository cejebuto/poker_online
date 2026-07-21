import type { InternalRoom } from './types.js';

/** In-memory room registry (hot state). */
class RoomRegistry {
  private byId = new Map<string, InternalRoom>();
  private byCode = new Map<string, string>();

  set(room: InternalRoom): void {
    this.byId.set(room.roomId, room);
    this.byCode.set(room.code.toUpperCase(), room.roomId);
  }

  get(roomId: string): InternalRoom | undefined {
    return this.byId.get(roomId);
  }

  getByCode(code: string): InternalRoom | undefined {
    const id = this.byCode.get(code.toUpperCase());
    return id ? this.byId.get(id) : undefined;
  }

  delete(roomId: string): void {
    const room = this.byId.get(roomId);
    if (room) {
      this.byCode.delete(room.code.toUpperCase());
      this.byId.delete(roomId);
    }
  }

  all(): InternalRoom[] {
    return [...this.byId.values()];
  }
}

export const roomRegistry = new RoomRegistry();
