#!/usr/bin/env bash
# 通知 N8N 任务结果
# 用法: bash notify-n8n.sh <result-json>
#
# 结果 JSON 格式:
# {
#   "success": true,
#   "task_id": "T-20260122-001",
#   "status": "completed",
#   "pr_url": "https://github.com/.../pull/123",
#   "ci_status": "green",
#   ...
# }

set -euo pipefail

RESULT="${1:-}"
WEBHOOK_URL="${N8N_WEBHOOK_URL:-http://localhost:5678/webhook/cecilia-result}"

if [[ -z "$RESULT" ]]; then
    echo "错误: 请提供结果 JSON" >&2
    exit 1
fi

# 验证 JSON 格式
if ! echo "$RESULT" | jq . > /dev/null 2>&1; then
    echo "错误: 无效的 JSON 格式" >&2
    exit 1
fi

# 发送 webhook
echo "发送结果到 N8N: $WEBHOOK_URL"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$RESULT")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
    echo "✅ 通知成功 (HTTP $HTTP_CODE)"
    echo "$BODY"
else
    echo "❌ 通知失败 (HTTP $HTTP_CODE)" >&2
    echo "$BODY" >&2
    exit 1
fi
