#!/bin/bash
set -e

echo "Starting custom build process..."

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Verify Prisma client was generated
if [ ! -d "node_modules/.prisma" ]; then
    echo "Error: Prisma client not generated properly"
    exit 1
fi

echo "Prisma client generated successfully"

# Run Next.js build
echo "Running Next.js build..."
npm run build
