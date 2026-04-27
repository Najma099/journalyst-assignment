# ============================================================
# Stage 1: Builder
# ============================================================
FROM node:22-alpine AS builder

# Install qpdf and build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies (including dev) for building
RUN npm ci

# Copy source and build
COPY tsconfig*.json ./
COPY src ./src

RUN npm run build

# ============================================================
# Stage 2: Production
# ============================================================
FROM node:22-alpine AS production

# Install qpdf and dumb-init in final image
RUN apk add --no-cache qpdf dumb-init

# Use non-root user for security
USER node
WORKDIR /home/node/app

# Copy package files
COPY --chown=node:node package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev


# Copy compiled output from builder
COPY --chown=node:node --from=builder /app/dist ./dist

EXPOSE 8080

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]