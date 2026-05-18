# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV UV_THREADPOOL_SIZE=8


# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Install ALL node modules (including devDependencies for vite build)
COPY package-lock.json package.json ./
COPY app/package.json app/package.json
COPY api/package.json api/package.json
RUN NODE_ENV=development npm ci

# Copy application code
COPY . .

# Frontend env vars baked into bundle at build time
ARG VITE_SENTRY_DSN=""
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_ANON_KEY=""
ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

# Build application
RUN npm run build

# Remove devDependencies after build
RUN npm prune --omit=dev


# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "npm", "run", "start" ]
