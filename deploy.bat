@echo off
echo ================================
echo  Arthya — Deploy to Railway
echo ================================
echo.
echo Step 1: Adding all files...
git add .
echo.
echo Step 2: Committing...
git commit -m "migrate: switch from Render to Railway deployment"
echo.
echo Step 3: Pushing to GitHub...
git push origin main
echo.
echo ================================
echo  Done! Now follow these steps:
echo ================================
echo 1. Go to railway.app
echo 2. Sign up with GitHub (no card needed)
echo 3. New Project - Deploy from GitHub
echo 4. Select finance-os repo
echo 5. Add PostgreSQL database
echo 6. Deploy backend (root: finance-os-backend)
echo 7. Deploy frontend (root: finance-os-frontend)
echo 8. Set environment variables
echo ================================
pause
