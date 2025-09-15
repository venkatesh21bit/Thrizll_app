@echo off
echo 🌐 Thrizll Web Deployment Script (Windows)
echo ==========================================

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm is required but not installed. Aborting.
    exit /b 1
)

echo 📦 Installing dependencies...
call npm install

echo 🧹 Cleaning previous build...
if exist web-build rmdir /s /q web-build

echo 🏗️  Building for web...
call npx expo export:web

if %errorlevel% equ 0 (
    echo ✅ Web build successful!
    echo 📁 Build output is in ./web-build
    echo.
    echo 🚀 Deployment options:
    echo 1. Vercel: cd web-build ^&^& vercel --prod
    echo 2. Netlify: cd web-build ^&^& netlify deploy --prod --dir .
    echo 3. Local preview: cd web-build ^&^& npx serve -s .
    echo.
    echo 🌐 Your app is ready for web deployment!
) else (
    echo ❌ Build failed. Please check the errors above.
    exit /b 1
)