FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/shared packages/shared
COPY packages/database packages/database
COPY apps/worker apps/worker
RUN --mount=type=cache,target=/root/.npm npm ci

FROM deps AS dev
CMD ["npm", "run", "dev", "-w", "worker"]

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -w @toth/shared && npm run build -w @toth/database && npm run build -w worker

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/packages/shared ./packages/shared
CMD ["node", "dist/apps/worker/src/main.js"]
