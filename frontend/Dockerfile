FROM node:20-bookworm-slim AS build
WORKDIR /app
ARG VITE_APP_TOKEN=
ENV VITE_APP_TOKEN=$VITE_APP_TOKEN
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
