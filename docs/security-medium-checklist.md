# Security medium checklist (phase 09)

| Item | Status |
|------|--------|
| Room password exactly 6 letters | ✅ validated |
| Password stored hashed (bcrypt) | ✅ |
| Password never in public state / logs of events | ✅ tested |
| JWT secret from env, expires | ✅ |
| CORS restricted to WEB_ORIGIN | ✅ |
| Rate limit joins / actions / create | ✅ |
| displayName sanitized | ✅ |
| Deck / foreign hole cards never in client payloads | ✅ (privacy tests) |
| Mesa role read-only (no private cards) | ✅ |
| OAuth / MFA / E2E / DDoS edge | ❌ out of scope (concept) |

Production: terminate TLS at reverse proxy; force `WEB_ORIGIN` https; rotate `JWT_SECRET` on compromise.
