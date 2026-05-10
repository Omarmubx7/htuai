@echo off
REM verify-db-setup.bat - Verify your database configuration is correct (Windows)

echo 🔍 Verifying Database Setup...
echo.

REM Check 1: Is .env.local gitignored?
echo 1️⃣  Checking if .env.local is gitignored...
git check-ignore .env.local >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ✅ .env.local is properly gitignored
) else (
    echo    ❌ .env.local is NOT gitignored - this is a security risk!
)
echo.

REM Check 2: Does .env.local exist?
echo 2️⃣  Checking if .env.local exists...
if exist .env.local (
    echo    ✅ .env.local exists
) else (
    echo    ❌ .env.local not found - create it first
    exit /b 1
)
echo.

REM Check 3: Is .env.local using localhost?
echo 3️⃣  Checking if .env.local points to LOCAL database...
findstr /M "localhost:5432 127.0.0.1:5432" .env.local >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ✅ .env.local points to localhost ^(GOOD^)
) else (
    echo    ⚠️  .env.local might point to production - check it manually
    for /F "tokens=*" %%i in ('findstr "POSTGRES_PRISMA_URL" .env.local') do echo    %%i
)
echo.

REM Check 4: Does .env.example exist?
echo 4️⃣  Checking if .env.example exists ^(safe to commit^)...
if exist .env.example (
    echo    ✅ .env.example exists
) else (
    echo    ⚠️  .env.example not found
)
echo.

REM Check 5: Is Prisma schema correct?
echo 5️⃣  Checking Prisma schema...
findstr "POSTGRES_PRISMA_URL" prisma\schema.prisma >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ✅ Prisma uses POSTGRES_PRISMA_URL environment variable
) else (
    echo    ⚠️  Prisma might use different variable name
)
echo.

echo ════════════════════════════════════════════════
echo Next steps:
echo 1. Update .env.local with your actual postgres password
echo 2. Open PostgreSQL command line and run: CREATE DATABASE htuai_dev;
echo 3. Run: npx prisma db push
echo 4. Run: npm run dev
echo ════════════════════════════════════════════════
pause
