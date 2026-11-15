FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/share-api/package.json apps/share-api/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/validation/package.json packages/validation/package.json
COPY packages/packing/package.json packages/packing/package.json
COPY packages/io/package.json packages/io/package.json
RUN npm ci
COPY tsconfig.json ./
COPY packages ./packages
COPY apps/share-api ./apps/share-api
ENV HOST=0.0.0.0 PORT=3001 DATABASE_PATH=/data/snapshots.sqlite
RUN mkdir /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3001
CMD ["node", "--import", "tsx", "apps/share-api/src/server.ts"]
