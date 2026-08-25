FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY admin/package.json ./admin/package.json

RUN npm ci --workspace admin --include-workspace-root

COPY admin ./admin

# VITE_* e publico por definicao: coloque aqui somente a URL publica da API.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm --workspace admin run build

FROM nginx:1.27-alpine AS runtime

COPY deploy/nginx/admin-container.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/admin/dist /usr/share/nginx/html

EXPOSE 80
