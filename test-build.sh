#!/bin/bash
# test-build.sh

# Unset potentially interfering Vercel/Next.js environment variables 
# that might be automatically set by Cloud Workstations or other environments.
# This helps ensure our explicit settings below take precedence for asset path generation.
unset NEXT_PUBLIC_VERCEL_URL
unset NEXT_PUBLIC_SITE_URL
unset NEXT_PUBLIC_URL # Another common one Next.js might look at
unset VERCEL_URL # Common in Vercel environments

# Explicitly set HOSTNAME to localhost for the build, as Next.js might use it
export HOSTNAME="localhost"

# --- Environment variables for the build process ---
# Set LOCAL_PROD_TEST for next.config.ts logic to apply local-specific settings
export LOCAL_PROD_TEST=true

# Set port, primarily for consistency if next.config.ts reads it for URLs
export PORT=3000

export NODE_ENV=production

# URLs for Next.js to use for itself and for your app logic during build
export NEXTAUTH_URL="http://localhost:3000"
export NEXT_PUBLIC_APP_URL="http://localhost:3000"
export NEXT_PUBLIC_BASE_URL="http://localhost:3000"
export NEXT_PUBLIC_SHORTENER_DOMAIN="http://localhost:3000"

# Force asset prefixing for localhost. Empty string makes paths relative to the current domain.
export NEXT_PUBLIC_ASSET_PREFIX=""

# Database and secrets (ensure these are correct for any build-time data fetching)
export DB_TYPE="postgres"
export POSTGRES_URI="postgresql://lnker:42869923Mum@bot.courzey.com/lnker"
export NEXTAUTH_SECRET="your_secret"

# --- Diagnostic Step ---
echo "--------------------------------------------------"
echo "Relevant environment variables before 'npm run build':"
printenv | grep -E '^(NEXT_|HOSTNAME=|PORT=|LOCAL_PROD_TEST=|NODE_ENV=|DB_TYPE=|POSTGRES_URI=)'
echo "--------------------------------------------------"

npm run build

echo "--------------------------------------------------"
echo "Build finished.
If asset paths are still wrong, check next.config.ts for conditional assetPrefix based on LOCAL_PROD_TEST.
Ensure no other Cloud Workstation env var is overriding asset path generation."
echo "--------------------------------------------------"
