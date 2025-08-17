# VoiceChatStable - 音声対話AIシステム 完全構築ガイド

## 🏗️ システム概要

### システムの目的
リアルタイム音声入力 → AI応答生成 → 音声出力の完全自動化システム

### 技術スタック
- **フロントエンド**: Next.js 14 + TypeScript + Tailwind CSS
- **音声処理**: OpenAI Whisper (STT) + TTS (音声合成)
- **AI**: OpenAI GPT-3.5-turbo (日本語最適化)
- **実行環境**: Node.js + Windows PowerShell

## 🎯 システムアーキテクチャ

`
[ユーザー音声入力] 
    ↓
[ブラウザ - MediaRecorder API]
    ↓ WebSocket/HTTP
[Next.js API Route (/api/chat)]
    ↓
[OpenAI Whisper API] → [テキスト変換]
    ↓
[GPT-3.5-turbo] → [応答生成]
    ↓
[OpenAI TTS API] → [音声合成]
    ↓
[Base64音声データ] → [ブラウザ再生]
`

## 🔧 核心技術詳細

### API Route処理フロー (route.ts)
1. **音声受信**: FormData で WebM音声ファイル受け取り
2. **STT処理**: OpenAI Whisper APIで日本語音声→テキスト変換
3. **AI応答**: GPT-3.5-turbo で日本語応答生成 (max_tokens: 200)
4. **TTS処理**: OpenAI TTS-1-HD で高品質音声合成
5. **データ返却**: JSON形式で {userText, assistantText, audioData(Base64)}

## 🔥 重要設定詳細

### OpenAI API設定 (route.ts)
- **Whisper**: language='ja' (日本語専用)
- **GPT-3.5**: max_tokens=200, temperature=0.7 (バランス型)
- **TTS**: model='tts-1-hd', voice='alloy', speed=0.9 (高品質・明瞭)

### 音声処理設定 (VoiceChat.tsx)
- **録音**: mimeType='audio/webm;codecs=opus'
- **再生**: type='audio/mpeg' (Base64 → Blob変換)
- **品質**: echoCancellation, noiseSuppression, autoGainControl

## 🔍 トラブルシューティング

### よくある問題と解決法
1. **音声途中停止** → max_tokens 増加 (現在200)
2. **マイクアクセス拒否** → HTTPS環境に移行
3. **音声再生失敗** → ブラウザコンソールでエラー確認
4. **API エラー** → .env.local のキー確認
5. **依存関係エラー** → npm install 再実行

作成日時: 2025/08/17 15:11:15
