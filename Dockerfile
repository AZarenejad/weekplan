FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci
COPY . .
ENV VITE_API_URL=/api
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production DB_PATH=/data/weekplan.db WEB_DIST=/app/web PORT=4173
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --omit=dev -w apps/api
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/web/dist ./web
RUN mkdir /data && chown node:node /data
VOLUME /data
USER node
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:4173/api/health || exit 1
CMD ["node", "dist/server.js"]
