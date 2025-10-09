FROM node:24.6.0-alpine AS build-stage

WORKDIR /app

COPY Homeport/ ./ 
COPY Homeport/package*.json ./
RUN npm install  --legacy-peer-deps


ARG CONFIGURATION=production
RUN npm run build
 

FROM nginx:alpine AS production-stage
COPY --from=build-stage /app/dist/homeport/browser /usr/share/nginx/html

COPY Homeport/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80

# Démarrer Nginx
ENV SERVER_NAME=10.18.209.122
CMD ["nginx", "-g", "daemon off;"]