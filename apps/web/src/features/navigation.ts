export type Screen =
  | 'user'
  | 'home'
  | 'create'
  | 'join'
  | 'mesa-join'
  | 'lobby'
  | 'play'
  | 'table'
  | 'themes'
  | 'roulette';

export type BackAction = {
  label: string;
  /** `leave` drops the seat and clears the session; the others only navigate. */
  action: 'home' | 'lobby' | 'leave' | 'themes-return';
};

/**
 * The escape hatch for a screen. Every screen except the entry ones offers one,
 * so a finished game or a mesa device can never trap the user.
 */
export function backFor(screen: Screen): BackAction | null {
  switch (screen) {
    // 'roulette' is full-bleed and carries its own back control.
    case 'user':
    case 'home':
    case 'roulette':
      return null;
    case 'create':
    case 'join':
    case 'mesa-join':
      return { label: '← Inicio', action: 'home' };
    case 'themes':
      return { label: '← Atrás', action: 'themes-return' };
    case 'play':
      return { label: '← Lobby', action: 'lobby' };
    case 'lobby':
    case 'table':
      return { label: '← Salir', action: 'leave' };
  }
}

/** Leaving mid-hand forfeits the seat, so it is worth a confirmation. */
export function needsLeaveConfirm(roomPhase: string | undefined): boolean {
  return roomPhase === 'IN_HAND';
}
