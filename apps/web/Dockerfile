FROM node:24-alpine AS base
RUN npm install -g pnpm@11.13.1

FROM base AS builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @repo/shared build
RUN pnpm --filter web build

FROM node:24-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm@11.13.1

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/web ./apps/web
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules

ENV NODE_ENV=production
ENV VITE_API_URL=http://localhost:3001/api
EXPOSE 3000

CMD ["pnpm", "--filter", "web", "start"]
