
# Dockerfile for Next.js application

# ---- Base Node ----
FROM node:20-alpine AS base
# Install git
RUN apk add --no-cache git
WORKDIR /app

# ---- Source Code ----
# This stage clones the repository
FROM base AS source_code
WORKDIR /app
# Build arguments for repository URL and branch/commit
ARG GIT_REPO_URL=https://github.com/rodenp/shorten-it.git
ARG GIT_BRANCH=main # Or you can use a specific commit SHA

# Clone the specific branch of the repository
# Using --depth 1 for a shallow clone if you only need the latest commit of the branch
RUN git clone --branch ${GIT_BRANCH} --single-branch --depth 1 ${GIT_REPO_URL} .

# ---- Dependencies ----
FROM base AS deps
WORKDIR /app

# Copy package.json and lock file from the source_code stage
COPY --from=source_code /app/package.json /app/package-lock.json* ./

# Install dependencies
RUN npm ci

# ---- Builder ----
FROM base AS builder
WORKDIR /app

# Copy dependencies from the deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy the rest of the application code from the source_code stage
COPY --from=source_code /app/ ./ 

# Set build-time environment variables if needed (e.g., for NEXT_PUBLIC_ vars)
# These can also be set at runtime via docker-compose.yml or passed during build
# Example: ARG NEXT_PUBLIC_SHORTENER_DOMAIN
# ENV NEXT_PUBLIC_SHORTENER_DOMAIN=$NEXT_PUBLIC_SHORTENER_DOMAIN

# Build the Next.js application
RUN npm run build

# ---- Runner ----
FROM base AS runner
WORKDIR /app

# Set environment variables - defaults can be set here, but prefer docker-compose for secrets
ENV NODE_ENV=production
ENV PORT=3000

# Copy necessary files from the builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./standalone
COPY --from=builder /app/.next/static ./standalone/.next/static

EXPOSE 3000

# Command to run the application (using the standalone output)
CMD ["node", "standalone/server.js"]

