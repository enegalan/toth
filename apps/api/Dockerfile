FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/shared packages/shared
COPY packages/database packages/database
COPY apps/api apps/api
RUN --mount=type=cache,target=/root/.npm npm ci

FROM deps AS dev
EXPOSE 3001
CMD ["npm", "run", "dev", "-w", "api"]

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -w @toth/shared && npm run build -w @toth/database && npm run build -w api

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/api/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh
EXPOSE 3001
ENTRYPOINT ["/app/docker-entrypoint.sh"]
