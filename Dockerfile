FROM node:20-slim AS base

# Install dependencies required for canvas and sharp
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    python3 \
    pkg-config \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create a mock module for canvas during build
RUN mkdir -p /app/mocks/canvas && \
    echo 'module.exports = { createCanvas: () => ({ getContext: () => ({}) }); };' > /app/mocks/canvas/index.js && \
    echo '{ "name": "canvas", "version": "2.11.2" }' > /app/mocks/canvas/package.json

# Create public directory if it doesn't exist
RUN mkdir -p /app/public

# Set environment variables for the build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_PATH=/app/mocks:/app/node_modules

# Make sure Next.js is configured for standalone output
RUN if ! grep -q "output: 'standalone'" next.config.js; then \
      echo "ERROR: Your next.config.js must include 'output: \"standalone\"' to build with Docker."; \
      echo "Please add 'output: \"standalone\"' to the config object in next.config.js"; \
      exit 1; \
    fi

# Run the build
RUN npm run build

# Production image
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install canvas dependencies in the production image
RUN apt-get update && apt-get install -y \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Create public directory in the runner
RUN mkdir -p /app/public

# Copy only necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/fonts ./fonts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json* ./package-lock.json*

# Install only the canvas package in the production image
RUN npm install --no-save canvas

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set hostname
ENV HOSTNAME="0.0.0.0"

# Start the server
CMD ["node", "server.js"] 