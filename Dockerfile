# Multi-stage build for a Vite (Vue) app using pnpm
# Builder stage
FROM node:25-alpine AS base
WORKDIR /app 
FROM base AS builder
RUN npm -g install pnpm

# Kopier lock + manifest først for å cache install
COPY package.json pnpm-lock.yaml* ./

RUN pnpm install --frozen-lockfile

# Kopier resten av koden
COPY . .

# Installer dependencies og bygg
RUN pnpm build

FROM base AS runner

WORKDIR /app

RUN npm -g install pnpm

COPY --from=builder /app/dist/ ./dist

RUN npm -g install serve

CMD ["serve", "-s", "dist", "-p", "3000"]