
# Dockerfile for Next.js application using npm run start

# ---- Base Node ----
    FROM node:20-alpine AS base
    # Install git
    RUN apk add --no-cache git
    WORKDIR /app
    
    # ---- Source Code ----
    FROM base AS source_code
    WORKDIR /app
    ARG GIT_REPO_URL=https://github.com/rodenp/shorten-it.git
    ARG GIT_BRANCH=master
    # Clone into a specific directory named 'repo_content' to be explicit
    RUN git clone --branch ${GIT_BRANCH} --single-branch --depth 1 ${GIT_REPO_URL} repo_content
    # Diagnostic: Check contents after clone
    RUN echo "Listing /app contents in source_code stage (after clone):" && ls -la /app 
    RUN echo "Listing /app/repo_content contents in source_code stage:" && ls -la /app/repo_content
    RUN mkdir -p /app/repo_content/public && \
        echo "Listing /app/repo_content/public contents in source_code stage:" && \
        ls -la /app/repo_content/public
    # ---- Dependencies ----
    FROM base AS deps
    WORKDIR /app
    # Files are now under /app/repo_content/ in source_code stage
    COPY --from=source_code /app/repo_content/package.json /app/repo_content/package-lock.json* ./
    RUN npm ci 
    
    # ---- Builder ----
    FROM base AS builder
    WORKDIR /app
    COPY --from=deps /app/node_modules ./node_modules
    # Files are now under /app/repo_content/ in source_code stage
    COPY --from=source_code /app/repo_content/ ./ 
    
    # Set build-time environment variables
    ARG DB_TYPE=postgres
    ARG POSTGRES_URI
    ARG DATABASE_URL 
    ARG NEXT_PUBLIC_SHORTENER_DOMAIN
    ARG NEXTAUTH_URL
    ARG NEXTAUTH_SECRET
    ARG PORT 
    
    ENV DB_TYPE=${DB_TYPE}
    ENV POSTGRES_URI=${POSTGRES_URI}
    ENV DATABASE_URL=${DATABASE_URL}
    ENV NEXT_PUBLIC_SHORTENER_DOMAIN=${NEXT_PUBLIC_SHORTENER_DOMAIN}
    ENV NEXTAUTH_URL=${NEXTAUTH_URL}
    ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    ENV PORT=${PORT}
    
    RUN npm run build
    
    # ---- Runner ----
    FROM base AS runner
    WORKDIR /app
    
    ENV NODE_ENV=production
    ENV PORT=${PORT:-3000}
    
    # Files are now under /app/repo_content/ in source_code stage
    COPY --from=source_code /app/repo_content/package.json /app/repo_content/package-lock.json* ./
    RUN npm ci --omit=dev
    
    COPY --from=builder /app/.next ./.next
    # Files are now under /app/repo_content/ in source_code stage
    COPY --from=source_code /app/repo_content/public ./public
    # next.config.ts is at the root of what was copied into builder (which was /app/repo_content/)
    COPY --from=builder /app/next.config.ts ./next.config.ts 
    
    EXPOSE ${PORT}
    
    CMD ["npm", "run", "start"]
    
    