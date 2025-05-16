#!/bin/bash
# test.sh

export LOCAL_PROD_TEST=true
export PORT=3000
export NODE_ENV=production
export NEXTAUTH_URL="http://localhost:3000"
export DB_TYPE="postgres"
export POSTGRES_URI="postgresql://lnker:42869923Mum@bot.courzey.com/lnker"
export NEXTAUTH_SECRET="your_secret"
export NEXT_PUBLIC_SHORTENER_DOMAIN="http://localhost:3000"
export NEXT_PUBLIC_BASE_URL="http://localhost:3000"
export NEXT_PUBLIC_APP_URL="http://localhost:3000"
export HOSTNAME="localhost"

npm run start
