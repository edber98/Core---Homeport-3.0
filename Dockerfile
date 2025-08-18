FROM node:24.6.0-alpine AS build-stage

WORKDIR /app
COPY package*.json ./
RUN npm install  --legacy-peer-deps
COPY . .
RUN npm run build 

FROM nginx:alpine AS production-stage
COPY --from=build-stage /app/dist/homeport/browser /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80

# Démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]
