FROM node:20-alpine AS dependencies

WORKDIR /app

# Mantemos os manifests dos workspaces para o npm usar o package-lock raiz.
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json

RUN npm ci --workspace backend --include-workspace-root

FROM dependencies AS build

COPY backend ./backend

# O client Prisma precisa existir antes da imagem de execucao iniciar.
RUN npm --workspace backend run prisma:generate

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

# A Luna recebe imagens, não vídeo direto. O ffmpeg extrai quadros dos vídeos de treino.
RUN apk add --no-cache ffmpeg

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend ./backend

# O volume de uploads e montado neste caminho pelo Compose.
RUN mkdir -p /app/backend/uploads

EXPOSE 3333

# migrate deploy e seguro para aplicar apenas migrations pendentes. Nao use seed
# aqui: ele e exclusivo para ambiente de demonstracao e remove dados existentes.
CMD ["sh", "-c", "npm --workspace backend run prisma:deploy && npm --workspace backend run start"]
