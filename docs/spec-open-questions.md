# Spec §19 — open questions resolution

| # | Question | Resolution in this codebase |
|---|----------|----------------------------|
| 1 | Fold until river | Fold always available; other actions by legal state (engine) |
| 2 | Max players | **9** (capped in `normalizeRoomConfig`) |
| 3 | Identity | Anonymous per room: displayName + avatar, JWT session |
| 4 | Tournament blinds | Default structure ~5 min levels (`DEFAULT_BLIND_STRUCTURE`) |
| 5 | doubleMinimum | **Min open / BB floor = 2× configured BB** when enabled |
| 6 | Language / branding | UI Spanish (Rioplatense copy); product name “Poker con Amigos” |
| 7 | Hosting | Docker Compose + Caddy; cloud-agnostic |
