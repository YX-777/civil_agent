@echo off
REM 数据库初始化脚本 (Windows)
REM 在首次运行项目前执行

echo ==========================================
echo   TechMate 数据库初始化
echo ==========================================

cd /d %~dp0

REM 1. 推送 Prisma schema
echo 创建数据库表...
cd packages\database
call npx prisma db push --skip-generate
cd ..

REM 2. 复制数据库文件到 web 包
echo 复制数据库文件...
if not exist packages\web\data mkdir packages\web\data
copy packages\database\prisma\data\tech-mate.db packages\web\data\tech-mate.db >nul 2>&1

REM 3. 创建默认用户（需要 sqlite3 命令）
echo 创建默认用户...
sqlite3 packages\web\data\tech-mate.db "INSERT OR IGNORE INTO users (id, created_at, updated_at) VALUES ('default-user', datetime('now'), datetime('now'));"

echo.
echo ✅ 数据库初始化完成！
echo    数据库文件：packages\web\data\tech-mate.db
echo.
pause