# VoiceChatStable クイック復旧スクリプト

Set-Location "C:\dev\VoiceChatStable"

Write-Host "🔧 VoiceChatStable クイック復旧開始..." -ForegroundColor Green

# 依存関係確認・再インストール
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 依存関係インストール中..." -ForegroundColor Yellow
    npm install
}

# 環境変数確認
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️ .env.local が見つかりません。手動で作成してください:" -ForegroundColor Red
    Write-Host "   OPENAI_API_KEY=あなたのキー" -ForegroundColor Yellow
} else {
    Write-Host "✅ 環境変数ファイル確認済み" -ForegroundColor Green
}

# 重要ファイル確認
$files = @(
    "src\app\api\chat\route.ts",
    "src\components\VoiceChat.tsx", 
    "src\app\page.tsx",
    "src\app\layout.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ $file 存在" -ForegroundColor Green
    } else {
        Write-Host "❌ $file 不足 - バックアップから復元が必要" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🚀 復旧完了。以下のコマンドで開発サーバーを起動:" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor White
