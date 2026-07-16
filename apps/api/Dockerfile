FROM node:24-alpine AS base
RUN npm install -g pnpm@11.13.1

FROM base AS builder
WORKDIR /app

# Copiar arquivos de configuração do monorepo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @repo/shared build
RUN pnpm --filter api build

FROM node:24-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm@11.13.1

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["node", "apps/api/dist/server.js"]
