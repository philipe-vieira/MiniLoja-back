# syntax=docker/dockerfile:1.7

# `base`: imagem e diretório base compartilhados pelos outros stages.
FROM node:24-alpine AS base
WORKDIR /app

# `deps`: instala todas as dependências (inclui dev) para compilar e testar.
FROM base AS deps
COPY package*.json ./
RUN npm ci

# `build`: usa as deps completas para gerar o bundle compilado em `dist/`.
FROM deps AS build
COPY . .
RUN npm run build

# `prod-deps`: instala somente dependências de produção para reduzir a imagem final.
FROM base AS prod-deps
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# `runner`: runtime mínimo; recebe apenas `dist/` e deps de produção.
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
# Executa como usuário não-root por segurança.
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
