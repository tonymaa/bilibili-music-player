# Build stage for client
FROM node:20-alpine AS client-builder

WORKDIR /app

COPY shared/types ./shared/types
COPY client/package*.json ./client/
WORKDIR /app/client
RUN npm ci

COPY client/ ./
RUN npm run build

# Build stage for server
FROM node:20-alpine AS server-builder

WORKDIR /app

COPY shared/types ./shared/types
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci

COPY server/ ./
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy server built files
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/package*.json ./
RUN npm ci --only=production

# Copy client built files to public directory
COPY --from=client-builder /app/client/dist ./public

# Create database directory
RUN mkdir -p database

EXPOSE 17600

ENV NODE_ENV=production

CMD ["node", "dist/app.js"]
