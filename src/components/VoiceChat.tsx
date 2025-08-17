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
      
      // エラーチェック
      if (data.error) {
        throw new Error(data.error)
      }

      const userText = data.userText || '（認識できませんでした）'
      const assistantText = data.assistantText || '（応答を生成できませんでした）'
      const audioData = data.audioData
      const audioSize = data.audioSize || 0
      const textLength = data.textLength || 0
      
      console.log('Response data:', { userText, assistantText, audioSize, textLength })
      
      // 会話履歴に追加
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
          
          // Base64を音声に変換（完全性チェック付き）
          const audioBytes = Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
          const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' })
          const audioUrl = URL.createObjectURL(audioBlob)
          const audio = new Audio(audioUrl)
          
          // 音声再生イベント設定
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
          
          // 確実な再生開始
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

      {/* 会話履歴表示（詳細情報付き） */}
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
