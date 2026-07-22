FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# prisma.config.ts validates DATABASE_URL is present even for `generate`
# (which doesn't connect to a DB) — a placeholder is enough here, since the
# real value is injected as a Compose environment override at container start.
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
RUN npx prisma generate
RUN npm run build
# The Prisma client's query engine binary is a native asset (not a .ts file), so
# nest build's tsc pass never copies it into dist/ alongside the compiled client —
# but PrismaClient resolves the engine relative to its own compiled __dirname, so
# it must be copied there explicitly.
RUN find generated/prisma -maxdepth 1 -type f ! -name "*.ts" -exec cp {} dist/generated/prisma/ \;

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
