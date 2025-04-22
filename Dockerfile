# Use Node.js LTS version with Linux platform
FROM --platform=linux/amd64 node:20-alpine AS base

# Install dependencies required for sharp and canvas
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconfig \
    pixman-dev \
    cairo-dev \
    pango-dev \
    libjpeg-turbo-dev \
    giflib-dev \
    librsvg-dev \
    && npm install -g node-gyp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with platform-specific flags
RUN npm ci --platform=linux --arch=x64

# Copy the rest of the application
COPY . .

# Rebuild canvas for Linux target architecture
RUN npm rebuild canvas --build-from-source --platform=linux --arch=x64

# Build the application
RUN npm run build

# Production image
FROM --platform=linux/amd64 node:20-alpine AS production

# Install production dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconfig \
    pixman-dev \
    cairo-dev \
    pango-dev \
    libjpeg-turbo-dev \
    giflib-dev \
    librsvg-dev \
    && npm install -g node-gyp

WORKDIR /app

# Copy built application and production dependencies
COPY --from=base /app/next.config.js ./
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/.next/server ./.next/server
COPY --from=base /app/node_modules ./node_modules

# Create public directory if it doesn't exist
RUN mkdir -p public

# Rebuild canvas for Linux target architecture
RUN npm rebuild canvas --build-from-source --platform=linux --arch=x64

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV HOST=0.0.0.0

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"] 