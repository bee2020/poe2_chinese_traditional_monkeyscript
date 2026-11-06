@echo off
setlocal
chcp 65001 >nul
pushd "%~dp0"
if errorlevel 1 goto directory_failed

echo ===== POE2 本地字典更新与脚本构建 =====
echo.
where node >nul 2>nul
if errorlevel 1 goto missing_node
where npm >nul 2>nul
if errorlevel 1 goto missing_node

if not exist "node_modules\esbuild\package.json" goto missing_dependencies
if not exist "node_modules\typescript\package.json" goto missing_dependencies

echo [1/2] 联网抓取数据、生成字典并打包脚本...
echo 提示：部分在线抓取失败时，现有流水线可能使用本地缓存。
call npm run build:all
if errorlevel 1 goto failed

echo.
echo [2/2] 验证生成的脚本与字典...
call npm test
if errorlevel 1 goto failed

echo.
echo [成功] 本地构建与验证完成。
echo 脚本路径：%~dp0dist\poe_trade.user.js
echo 请将该文件内容更新到浏览器油猴中进行页面测试。
popd
exit /b 0

:missing_node
echo [失败] 未找到 Node.js 或 npm，请安装 Node.js 并重新打开此脚本。
goto failed

:missing_dependencies
echo [失败] 缺少构建依赖，请在项目目录执行 npm ci 后重试。
goto failed

:failed
echo.
echo [失败] 流程已停止，请查看上方错误信息。
popd
exit /b 1

:directory_failed
echo [失败] 无法进入脚本所在目录。
exit /b 1
