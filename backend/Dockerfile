# ==========================================
# Stage 1: Builder
# ==========================================
FROM node:26-alpine AS builder

WORKDIR /app

# Install build dependencies (needed for native modules)
RUN apk add --no-cache python3 make g++ openssl

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

# ==========================================
# Stage 2: Production
# ==========================================
FROM node:26-alpine AS production

# Install runtime dependencies only
RUN apk add --no-cache openssl python3 py3-pip samba-client krb5

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy only what's needed from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Ensure logs directory exists and is writable
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

USER nodejs

EXPOSE 3001

CMD ["node", "dist/index.js"]

# ==========================================
# Stage 3: Development (default target)
# ==========================================
FROM node:26-alpine AS development

RUN apk add --no-cache openssl python3 py3-pip samba-client krb5

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

# Create non-root user for dev
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

CMD ["npm", "run", "dev"]
