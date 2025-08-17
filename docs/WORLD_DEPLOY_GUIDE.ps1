# 🌐 VoiceChatStable世界公開デプロイ（完全自動）

Write-Host "🚀 世界公開デプロイ開始..." -ForegroundColor Green

# ステップ1: Git初期化
Write-Host "📋 ステップ1: Git準備..." -ForegroundColor Cyan
git init
git add .
git commit -m "VoiceChat AI - Ready for World"

Write-Host "✅ Git準備完了" -ForegroundColor Green

# ステップ2: GitHub案内
Write-Host "`n📋 ステップ2: GitHubリポジトリ作成" -ForegroundColor Cyan
Write-Host "1. https://github.com にアクセス" -ForegroundColor White
Write-Host "2. 右上の '+' → 'New repository' クリック" -ForegroundColor White
Write-Host "3. Repository name: 'voicechat-ai' と入力" -ForegroundColor White
Write-Host "4. 'Public' 選択" -ForegroundColor White
Write-Host "5. 'Create repository' クリック" -ForegroundColor White
Write-Host "6. 作成されたページのURL(https://github.com/ユーザー名/voicechat-ai)をコピー" -ForegroundColor White

$repoUrl = Read-Host "`n作成したリポジトリのURLを入力してください (https://github.com/ユーザー名/voicechat-ai)"

# ステップ3: GitHub Push
Write-Host "`n📋 ステップ3: コードをGitHubにPush..." -ForegroundColor Cyan
git remote add origin $repoUrl
git branch -M main
git push -u origin main

Write-Host "✅ GitHubへのPush完了" -ForegroundColor Green

# ステップ4: Vercel案内
Write-Host "`n📋 ステップ4: Vercelデプロイ" -ForegroundColor Cyan
Write-Host "1. https://vercel.com にアクセス" -ForegroundColor White
Write-Host "2. 'Start Deploying' クリック" -ForegroundColor White
Write-Host "3. 'Continue with GitHub' クリック" -ForegroundColor White
Write-Host "4. GitHubでサインイン" -ForegroundColor White
Write-Host "5. 'Import Git Repository' で 'voicechat-ai' を選択" -ForegroundColor White
Write-Host "6. 'Import' クリック" -ForegroundColor White
Write-Host "7. 'Deploy' クリック" -ForegroundColor White

Write-Host "`n⏳ デプロイ完了まで2-3分お待ちください..." -ForegroundColor Yellow

$vercelUrl = Read-Host "`nデプロイ完了後、Vercelから提供されたURL(https://your-project.vercel.app)を入力してください"

# ステップ5: 環境変数設定案内
Write-Host "`n📋 ステップ5: 環境変数設定（重要）" -ForegroundColor Cyan
Write-Host "1. Vercel Dashboard で作成されたプロジェクトをクリック" -ForegroundColor White
Write-Host "2. 'Settings' タブクリック" -ForegroundColor White
Write-Host "3. 左メニュー 'Environment Variables' クリック" -ForegroundColor White
Write-Host "4. 'Name': OPENAI_API_KEY と入力" -ForegroundColor White

# .env.localからAPIキー取得
if (Test-Path ".env.local") {
    $apiKey = Get-Content ".env.local" | Select-String "OPENAI_API_KEY" | ForEach-Object { $_.ToString().Split('=')[1] }
    Write-Host "5. 'Value': $apiKey と入力" -ForegroundColor White
} else {
    Write-Host "5. 'Value': あなたのOpenAI APIキー と入力" -ForegroundColor White
}

Write-Host "6. Environment: Production, Preview, Development 全てチェック" -ForegroundColor White
Write-Host "7. 'Save' クリック" -ForegroundColor White

Read-Host "`n環境変数設定完了後、Enterキーを押してください"

# ステップ6: 再デプロイ案内
Write-Host "`n📋 ステップ6: 最終デプロイ" -ForegroundColor Cyan
Write-Host "1. 'Deployments' タブクリック" -ForegroundColor White
Write-Host "2. 最新デプロイの右端 '...' → 'Redeploy' クリック" -ForegroundColor White
Write-Host "3. 'Redeploy' 確認クリック" -ForegroundColor White
Write-Host "4. 完了後 'Visit' クリックで公開URLを確認" -ForegroundColor White

Write-Host "`n🎉 世界公開完了！" -ForegroundColor Green
Write-Host "🌐 公開URL: $vercelUrl" -ForegroundColor Yellow
Write-Host "✅ 世界中の誰でもアクセス可能になりました！" -ForegroundColor Green

Write-Host "`n📱 テスト方法:" -ForegroundColor Cyan
Write-Host "1. 公開URLにアクセス" -ForegroundColor White
Write-Host "2. マイクボタンをクリック" -ForegroundColor White
Write-Host "3. 短く話しかける" -ForegroundColor White
Write-Host "4. AI音声応答を確認" -ForegroundColor White

Write-Host "`n🎯 他者への提供方法:" -ForegroundColor Cyan
Write-Host "- 公開URLを共有するだけで利用可能" -ForegroundColor White
Write-Host "- スマートフォンからもアクセス可能" -ForegroundColor White
Write-Host "- インストール不要" -ForegroundColor White
