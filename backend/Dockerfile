# --- AgriPulse backend image -------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies (cached layer)
COPY package*.json ./
COPY prisma ./prisma
RUN npm install

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate && npm run build

# --- Runtime -----------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma

EXPOSE 4000

# On container start: apply migrations, then launch.
# The server self-seeds the demo device on boot (idempotent ensureSeedData()).
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
