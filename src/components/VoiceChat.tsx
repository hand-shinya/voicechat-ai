'use client'

import React, { useState, useRef, useEffect } from 'react'

interface ChatMessage {
  id: number
  type: 'user' | 'ai'
  text: string
  audioSize?: number
  timestamp: Date
}

export default function VoiceChat() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [error, setError] = useState('')
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // 新メッセージ追加時に自動スクロール
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatHistory])

  const addMessage = (type: 'user' | 'ai', text: string, audioSize?: number) => {
    const newMessage: ChatMessage = {
      id: Date.now(),
      type,
      text,
      audioSize,
      timestamp: new Date()
    }
    setChatHistory(prev => [...prev, newMessage])
  }

  const startRecording = async () => {
    try {
      console.log('🎤 録音開始...')
      setError('')
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      const options = { mimeType: 'audio/webm' }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.log('webm非対応、デフォルト形式使用')
        mediaRecorderRef.current = new MediaRecorder(stream)
      } else {
        mediaRecorderRef.current = new MediaRecorder(stream, options)
      }

      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        console.log('🎵 音声データ受信:', event.data.size, 'bytes')
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        console.log('🛑 録音停止、処理開始...')
        await processRecording()
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      console.log('✅ 録音開始成功')

    } catch (error) {
      console.error('❌ 録音開始エラー:', error)
      setError(`録音開始エラー: ${error}`)
    }
  }

  const stopRecording = () => {
    console.log('⏹️ 録音停止中...')
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsProcessing(true)
    }
  }

  const processRecording = async () => {
    try {
      console.log('🔄 音声処理開始...')
      
      if (audioChunksRef.current.length === 0) {
        throw new Error('音声データがありません')
      }

      // 音声ファイル作成
      const recordedAudioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      console.log('📊 音声ファイルサイズ:', recordedAudioBlob.size, 'bytes')

      if (recordedAudioBlob.size === 0) {
        throw new Error('音声データが空です')
      }

      // FormData作成
      const formData = new FormData()
      formData.append('audio', recordedAudioBlob, 'recording.webm')
      
      console.log('📤 音声認識API呼び出し...')

      // Whisper API で音声をテキストに変換
      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })

      if (!transcribeResponse.ok) {
        const errorText = await transcribeResponse.text()
        throw new Error(`音声認識エラー: ${transcribeResponse.status} - ${errorText}`)
      }

      const transcribeData = await transcribeResponse.json()
      const transcribedText = transcribeData.text || ''
      
      console.log('✅ 音声認識成功:', transcribedText)

      if (!transcribedText.trim()) {
        throw new Error('音声が認識されませんでした')
      }

      // ユーザーメッセージを履歴に追加
      addMessage('user', transcribedText, recordedAudioBlob.size)

      // Chat API呼び出し
      console.log('🤖 AI応答生成開始...')
      
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: transcribedText.trim()
        })
      })

      console.log('📡 Chat API応答ステータス:', chatResponse.status)

      if (!chatResponse.ok) {
        const errorText = await chatResponse.text()
        console.error('❌ Chat APIエラー詳細:', errorText)
        throw new Error(`AI応答エラー: ${chatResponse.status}`)
      }

      // AIテキスト取得（デコード処理修正版）
      let aiResponseText = 'AI応答を再生中...'
      try {
        const encodedAiText = chatResponse.headers.get('X-AI-Response-Text')
        if (encodedAiText) {
          aiResponseText = decodeURIComponent(encodedAiText)
          console.log('✅ AIテキストデコード成功:', aiResponseText)
        }
      } catch (decodeError) {
        console.warn('⚠️ AIテキストデコードエラー:', decodeError)
        aiResponseText = 'AI応答（テキスト取得エラー）'
      }
      
      // AIメッセージを履歴に追加
      addMessage('ai', aiResponseText)

      // 音声データを受信
      const audioArrayBuffer = await chatResponse.arrayBuffer()
      console.log('🎵 AI音声受信:', audioArrayBuffer.byteLength, 'bytes')
      
      if (audioArrayBuffer.byteLength === 0) {
        throw new Error('AI音声データが空です')
      }

      // 音声再生
      const playbackAudioBlob = new Blob([audioArrayBuffer], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(playbackAudioBlob)
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl
        await audioRef.current.play()
        console.log('🔊 AI音声再生開始')
      }

    } catch (error) {
      console.error('❌ 処理エラー詳細:', error)
      setError(`処理エラー: ${error}`)
      addMessage('ai', `エラー: ${error}`)
    } finally {
      setIsProcessing(false)
      audioChunksRef.current = []
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const clearHistory = () => {
    setChatHistory([])
    setError('')
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="flex-shrink-0 bg-white shadow-sm border-b p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">🎤 AI音声チャット</h1>
          <button
            onClick={clearHistory}
            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
          >
            履歴クリア
          </button>
        </div>
      </div>

      {/* チャット履歴エリア（スクロール可能） */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {chatHistory.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>🎤 マイクボタンをクリックして会話を始めてください</p>
          </div>
        ) : (
          chatHistory.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-2xl w-fit p-4 rounded-lg ${
                message.type === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white text-gray-800 shadow-sm border'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold">
                    {message.type === 'user' ? '👤 あなた' : '🤖 AI'}
                  </span>
                  <span className="text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                  {message.audioSize && (
                    <span className="text-xs opacity-70">
                      ({(message.audioSize / 1024).toFixed(1)}KB)
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed">{message.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 録音コントロールエリア */}
      <div className="flex-shrink-0 bg-white border-t p-6">
        <div className="flex flex-col items-center space-y-4">
          <button
            onClick={toggleRecording}
            disabled={isProcessing}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all duration-200 ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                : isProcessing
                ? 'bg-yellow-500 text-white cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {isProcessing ? '⏳' : isRecording ? '⏹️' : '🎤'}
          </button>
          
          <p className="text-sm text-gray-600 text-center">
            {isProcessing ? '処理中...' : isRecording ? '録音中 - クリックで停止' : 'クリックで録音開始'}
          </p>

          {error && (
            <div className="w-full max-w-2xl p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">❌ {error}</p>
            </div>
          )}
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  )
}
