# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY packages/engine/package.json packages/engine/
COPY apps/web/package.json apps/web/
RUN corepack prepare pnpm@11.5.2 --activate \
  && pnpm install --filter @poker/web... --frozen-lockfile=false

FROM deps AS build
ARG VITE_WS_URL=
ENV VITE_WS_URL=$VITE_WS_URL
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/engine packages/engine
COPY apps/web apps/web
RUN pnpm --filter @poker/shared build \
  && pnpm --filter @poker/engine build \
  && pnpm --filter @poker/web build

FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
