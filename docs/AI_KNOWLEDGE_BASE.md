# VoiceChatStable 完全技術仕様書

## システム全体アーキテクチャ
```
[ユーザー音声入力] → [MediaRecorder API] → [Next.js /api/chat] → [OpenAI Whisper] → [GPT-3.5-turbo] → [TTS-1-HD] → [Base64音声] → [ブラウザ音声再生]
```

## 📁 完全フォルダ構造
```
C:\dev\VoiceChatStable\          # 全て1つのフォルダに集約
├── src\
│   ├── app\
│   │   ├── api\chat\route.ts    # 核心API (2.1KB)
│   │   ├── globals.css          # Tailwind設定
│   │   ├── layout.tsx           # レイアウト
│   │   └── page.tsx             # メインページ
│   └── components\VoiceChat.tsx # UI (8.7KB)
├── docs\                        # ドキュメント
├── backup\                      # 自動バックアップ
├── .env.local                   # OpenAI_API_KEY
├── package.json                 # 依存関係
└── next.config.js               # Next.js設定
```

## 🔧 核心実装コード（実証済み）

### route.ts (src/app/api/chat/route.ts) - 完全版
```typescript
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    console.log('Audio file received:', audioFile.type, audioFile.size, 'bytes')

    // ステップ1: Whisper APIで音声をテキストに変換
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ja',
    })

    const userText = transcription.text
    console.log('Transcription:', userText)

    if (!userText || userText.trim().length === 0) {
      return NextResponse.json({ error: 'No speech detected' }, { status: 400 })
    }

    // ステップ2: GPT-3.5で日本語専用応答生成
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'あなたは親しみやすい日本語AIアシスタントです。必ず日本語のみで回答してください。完全な文で終わる自然な回答をしてください。簡潔ですが完結した内容で答えてください。'
        },
        {
          role: 'user',
          content: userText
        }
      ],
      max_tokens: 200,          // 音声途中停止防止（重要）
      temperature: 0.7,
      presence_penalty: 0.0,
      frequency_penalty: 0.0
    })

    let assistantText = chatResponse.choices[0]?.message?.content?.trim()
    console.log('GPT Response (raw):', assistantText)

    if (!assistantText) {
      return NextResponse.json({ error: 'No response generated' }, { status: 500 })
    }

    // 文の完全性チェック（句読点で終わっているか確認）
    if (!assistantText.match(/[。！？]$/)) {
      assistantText += '。'
    }

    console.log('GPT Response (final):', assistantText)

    // ステップ3: TTS APIで高品質日本語音声生成
    const speechResponse = await openai.audio.speech.create({
      model: 'tts-1-hd',        // 高音質（重要）
      voice: 'alloy',           // 日本語最適
      input: assistantText,
      speed: 0.9,               // 明瞭性重視（重要）
      response_format: 'mp3'    // 明示的にMP3指定
    })

    // 音声データの完全性確保
    const audioArrayBuffer = await speechResponse.arrayBuffer()
    const audioBuffer = Buffer.from(audioArrayBuffer)
    const audioBase64 = audioBuffer.toString('base64')

    console.log('Audio generated, size:', audioBuffer.length, 'bytes')

    // JSONで音声とテキストの両方を返す
    return NextResponse.json({
      userText: userText,
      assistantText: assistantText,
      audioData: audioBase64,
      audioSize: audioBuffer.length,
      textLength: assistantText.length
    })

  } catch (error) {
    console.error('Audio chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
```

### VoiceChat.tsx (src/components/VoiceChat.tsx) - 核心部分
```typescript
'use client'

import { useState, useRef } from 'react'

interface ConversationItem {
  user: string
  assistant: string
  timestamp: string
  audioSize?: number
  textLength?: number
}

export default function VoiceChat() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState('🎤 会話準備完了')
  const [conversation, setConversation] = useState<ConversationItem[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = handleRecordingStop
      
      mediaRecorder.start()
      setIsRecording(true)
      setStatus('🔴 録音中（短く明確に話してください）')
      
    } catch (error) {
      console.error('録音開始エラー:', error)
      setStatus('❌ マイクアクセス失敗')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setStatus('⚡ AI処理中（音声生成中）...')
    }
  }

  const handleRecordingStop = async () => {
    setIsProcessing(true)
    
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const startTime = Date.now()
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Server error: ' + response.status)
      }

      const data = await response.json()
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(1)
      
      if (data.error) {
        throw new Error(data.error)
      }

      const userText = data.userText || '（認識できませんでした）'
      const assistantText = data.assistantText || '（応答を生成できませんでした）'
      const audioData = data.audioData
      const audioSize = data.audioSize || 0
      const textLength = data.textLength || 0
      
      const newConversation: ConversationItem = {
        user: userText,
        assistant: assistantText,
        timestamp: new Date().toLocaleTimeString('ja-JP'),
        audioSize,
        textLength
      }
      setConversation(prev => [...prev, newConversation])
      
      // 音声再生（完全性確保）
      if (audioData && audioSize > 0) {
        try {
          setStatus(`🔊 高品質音声再生中... (${processingTime}秒)`)
          
          const audioBytes = Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
          const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' })
          const audioUrl = URL.createObjectURL(audioBlob)
          const audio = new Audio(audioUrl)
          
          audio.onloadeddata = () => {
            console.log('Audio loaded, duration:', audio.duration)
          }
          
          audio.onended = () => {
            setStatus('✅ 会話準備完了')
            URL.revokeObjectURL(audioUrl)
          }
          
          audio.onerror = (e) => {
            console.error('Audio playback error:', e)
            setStatus(`📝 テキスト表示完了 (音声エラー・${processingTime}秒)`)
            URL.revokeObjectURL(audioUrl)
          }
          
          const playPromise = audio.play()
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.error('Play promise error:', error)
              setStatus(`📝 テキスト表示完了 (再生失敗・${processingTime}秒)`)
              URL.revokeObjectURL(audioUrl)
            })
          }
          
        } catch (audioError) {
          console.error('Audio conversion error:', audioError)
          setStatus(`📝 テキスト表示完了 (音声変換エラー・${processingTime}秒)`)
        }
      } else {
        setStatus(`📝 テキスト表示完了 (音声データなし・${processingTime}秒)`)
      }

    } catch (error) {
      console.error('処理エラー:', error)
      setStatus('❌ エラーが発生しました: ' + (error as Error).message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex flex-col items-center space-y-6 p-4">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4 text-gray-800">🎙️ 高品質音声AIチャット</h2>
        <p className="text-gray-600 mb-4 text-lg">
          短く明確に話しかけてください（完全な音声応答）
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`
            w-32 h-32 rounded-full text-white text-4xl font-bold
            transition-all duration-200 shadow-xl border-4 border-white
            ${isRecording 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-red-300' 
              : 'bg-green-500 hover:bg-green-600 shadow-green-300'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
          `}
        >
          {isRecording ? '🔴' : '🎤'}
        </button>
        
        <p className="text-lg font-semibold text-gray-700">
          {isRecording ? '録音停止' : '録音開始'}
        </p>
      </div>

      <div className="w-full max-w-lg">
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6 min-h-[80px] flex items-center justify-center border-2 border-gray-200">
          <p className="text-center text-gray-800 font-medium text-lg">
            {status}
          </p>
        </div>
      </div>

      {conversation.length > 0 && (
        <div className="w-full max-w-4xl">
          <h3 className="text-2xl font-bold mb-4 text-center text-gray-800">💬 会話履歴</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {conversation.map((item, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-400">
                <div className="text-sm text-gray-500 mb-3 flex justify-between items-center">
                  <span>{item.timestamp}</span>
                  {item.audioSize && item.textLength && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      音声: {(item.audioSize / 1024).toFixed(1)}KB / 文字: {item.textLength}
                    </span>
                  )}
                </div>
                <div className="mb-4">
                  <div className="text-sm font-bold text-blue-700 mb-2">👤 あなた:</div>
                  <div className="text-base text-gray-800 bg-blue-50 p-3 rounded-lg">{item.user}</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-green-700 mb-2">🤖 AI:</div>
                  <div className="text-base text-gray-800 bg-green-50 p-3 rounded-lg">{item.assistant}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-sm text-gray-500 text-center max-w-md space-y-1">
        <p>🇯🇵 <strong>完全日本語対応</strong> ・ 🔊 <strong>高品質音声</strong> ・ ⚡ <strong>高速処理</strong></p>
        <p>🎯 <strong>完全音声再生</strong> ・ 📝 <strong>詳細テキスト表示</strong></p>
        <p>💡 短い質問（5-10秒）で最適な体験を</p>
      </div>
    </div>
  )
}
```

## ⚙️ 重要設定値（実証済み最適値）

### OpenAI API最適設定
- **Whisper**: model='whisper-1', language='ja'
- **GPT-3.5**: model='gpt-3.5-turbo', max_tokens=200, temperature=0.7
- **TTS**: model='tts-1-hd', voice='alloy', speed=0.9

### ブラウザ音声最適設定
- **録音**: mimeType='audio/webm;codecs=opus'
- **音質**: echoCancellation=true, noiseSuppression=true
- **再生**: type='audio/mpeg', Base64デコード

## 🚀 Vercel完全デプロイ手順

### ステップ1: GitHubリポジトリ作成
1. https://github.com → New repository
2. Repository name: "voicechat-ai"
3. Public選択 → Create repository

### ステップ2: コードPush
```bash
git init
git add .
git commit -m "VoiceChat AI initial commit"
git remote add origin [YOUR_GITHUB_URL]
git branch -M main
git push -u origin main
```

### ステップ3: Vercelデプロイ
1. https://vercel.com → Continue with GitHub
2. Import Git Repository → voicechat-ai選択
3. Import → Deploy

### ステップ4: 環境変数設定（必須）
1. Settings → Environment Variables
2. Name: OPENAI_API_KEY
3. Value: [あなたのOpenAI APIキー]
4. Environment: All選択 → Save

### ステップ5: 再デプロイ
1. Deployments → 最新 → Redeploy
2. 完了後Visit → 公開URL確認

**結果**: https://your-project.vercel.app で世界中からアクセス可能

## 🚨 問題解決集（実証済み）

### 音声が途中で止まる
**原因**: max_tokens=60が短すぎ
**解決**: max_tokens=200に変更済み

### マイクアクセス失敗
**原因**: HTTP環境またはブラウザ制限
**解決**: HTTPS環境使用またはlocalhost利用

### 音声再生失敗
**原因**: Base64変換エラーまたは形式不適合
**解決**: エラーハンドリング強化済み

### API制限エラー
**原因**: OpenAI使用量上限
**解決**: OpenAI Usage確認、課金確認

### Vercelデプロイ失敗
**原因**: 環境変数未設定
**解決**: OPENAI_API_KEY正確設定必須

この技術仕様により、VoiceChatStableシステムを完全に再現・改良・運用できます。
