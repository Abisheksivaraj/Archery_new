@echo off
echo 🚀 Starting deployment...

cd frontend
echo 📦 Building React frontend...
call npm install
call npm run build

cd ..\backend
echo 📦 Installing backend dependencies...
call npm install

echo ✅ Starting server...
set NODE_ENV=production
node server.js