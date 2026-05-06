#!/bin/bash
# 小红书 MCP 登录状态检查脚本

XHS_MCP_DIR="/Users/sxh/Code/project/civil_agent/xiaohongshu-mcp-bin"
XHS_MCP_URL="http://localhost:18060/mcp"

echo "🔍 小红书 MCP 登录状态检查"
echo "================================"

# 检查 MCP 服务是否运行
echo ""
echo "[1] 检查 MCP 服务状态..."
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$XHS_MCP_URL" 2>/dev/null || echo "000")
if [[ "$CODE" == "405" || "$CODE" == "200" ]]; then
    echo "✅ MCP 服务运行中 (端口 18060)"
else
    echo "❌ MCP 服务未运行"
    echo "   启动命令: ./start-xhs-sync.sh"
    exit 1
fi

# 检查 cookies 文件
echo ""
echo "[2] 检查 cookies 文件..."
if [[ -f "$XHS_MCP_DIR/cookies.json" ]]; then
    COOKIE_COUNT=$(cat "$XHS_MCP_DIR/cookies.json" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
    if [[ "$COOKIE_COUNT" -gt 0 ]]; then
        echo "✅ cookies 文件存在 ($COOKIE_COUNT 条)"
    else
        echo "❌ cookies 文件为空或损坏"
        echo "   需要重新登录"
        exit 1
    fi
else
    echo "❌ cookies 文件不存在"
    echo "   需要重新登录"
    exit 1
fi

# 检查登录状态
echo ""
echo "[3] 检查小红书登录状态..."
cd /Users/sxh/Code/project/civil_agent/packages/mcp-xiaohongshu
LOGIN_RESULT=$(node -e "
const { getXiaohongshuMCPClient } = require('./dist/client/xiaohongshu-client.js');
const client = getXiaohongshuMCPClient();
client.checkLoginStatus()
  .then(r => {
    console.log(JSON.stringify(r));
    client.close();
  })
  .catch(e => {
    console.log('error:' + e.message);
    process.exit(1);
  });
" 2>/dev/null)

if [[ "$LOGIN_RESULT" == *"已登录"* ]]; then
    echo "✅ 小红书账号已登录"
    echo ""
    echo "================================"
    echo "🎉 所有检查通过，定时任务可正常运行"
elif [[ "$LOGIN_RESULT" == *"未登录"* ]]; then
    echo "❌ 小红书账号未登录"
    echo ""
    echo "================================"
    echo "⚠️  需要重新扫码登录"
    echo ""
    echo "操作步骤:"
    echo "  1. cd $XHS_MCP_DIR"
    echo "  2. ./xiaohongshu-login-darwin-arm64"
    echo "  3. 在弹出的浏览器中扫码"
    echo "  4. 扫码完成后重新启动: ./start-xhs-sync.sh"
else
    echo "⚠️  无法确定登录状态: $LOGIN_RESULT"
fi