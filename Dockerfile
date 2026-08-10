# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# node:20-alpine trae npm 10.8.2, que tiene un bug conocido validando
# bundleDependencies en paquetes wasm32-wasi de napi-rs (@tailwindcss/oxide-wasm32-wasi
# empaqueta @emnapi/* como bundleDependencies) — npm ci las marca como "missing from
# lock file" aunque el lockfile esté sano. Corregido en npm >=10.9. Se actualiza acá
# en vez de fijar una versión de imagen distinta para no tocar el resto del stage.
RUN npm install -g npm@11
RUN npm ci

COPY . .

ARG VITE_API_URL=https://api.aba.andrescortes.dev
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Custom nginx config with SPA fallback (try_files $uri /index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
