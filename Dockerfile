FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_OPENWEATHER_API_KEY=
ENV VITE_OPENWEATHER_API_KEY=${VITE_OPENWEATHER_API_KEY}
RUN npm run build

FROM nginxinc/nginx-unprivileged:alpine AS runtime

COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

EXPOSE 8080