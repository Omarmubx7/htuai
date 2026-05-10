#!/bin/bash
# verify-db-setup.sh - Verify your database configuration is correct

echo "🔍 Verifying Database Setup..."
echo ""

# Check 1: Is .env.local gitignored?
echo "1️⃣  Checking if .env.local is gitignored..."
if git check-ignore .env.local > /dev/null; then
    echo "   ✅ .env.local is properly gitignored"
else
    echo "   ❌ .env.local is NOT gitignored - this is a security risk!"
fi
echo ""

# Check 2: Does .env.local exist?
echo "2️⃣  Checking if .env.local exists..."
if [ -f .env.local ]; then
    echo "   ✅ .env.local exists"
else
    echo "   ❌ .env.local not found - create it first"
    exit 1
fi
echo ""

# Check 3: Is .env.local using localhost?
echo "3️⃣  Checking if .env.local points to LOCAL database..."
if grep -q "localhost:5432\|127.0.0.1:5432" .env.local; then
    echo "   ✅ .env.local points to localhost (GOOD)"
else
    echo "   ⚠️  .env.local might point to production - check it manually"
    grep "POSTGRES" .env.local | head -1
fi
echo ""

# Check 4: Does .env.example exist without secrets?
echo "4️⃣  Checking if .env.example exists (safe to commit)..."
if [ -f .env.example ]; then
    echo "   ✅ .env.example exists"
else
    echo "   ⚠️  .env.example not found - creating it would help team members"
fi
echo ""

# Check 5: Can we connect to local database?
echo "5️⃣  Attempting to connect to local PostgreSQL..."
if command -v psql &> /dev/null; then
    if PGPASSWORD=postgres psql -h localhost -U postgres -d htuai_dev -c "SELECT 1" > /dev/null 2>&1; then
        echo "   ✅ Successfully connected to htuai_dev database"
    else
        echo "   ❌ Cannot connect to htuai_dev - is PostgreSQL running?"
        echo "      Run: createdb -U postgres htuai_dev"
    fi
else
    echo "   ⏭️  psql not found - install PostgreSQL to test connection"
fi
echo ""

# Check 6: Is Prisma schema using correct env variable?
echo "6️⃣  Checking Prisma schema..."
if grep -q 'env("POSTGRES_PRISMA_URL")' prisma/schema.prisma; then
    echo "   ✅ Prisma uses POSTGRES_PRISMA_URL environment variable"
else
    echo "   ⚠️  Prisma might use different variable name"
fi
echo ""

echo "════════════════════════════════════════════════"
echo "Next steps:"
echo "1. Update .env.local with your actual postgres password"
echo "2. Run: createdb -U postgres htuai_dev"
echo "3. Run: npx prisma db push"
echo "4. Run: npm run dev"
echo "════════════════════════════════════════════════"
