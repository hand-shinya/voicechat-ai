'use client'

import React, { useState, useRef } from 'react'

export default function VoiceChat() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [response, setResponse] = useState('')
  const [audioSize, setAudioSize] = useState(0)
  const [error, setError] = useState('')
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement>(null)

  const startRecording = async () => {
    try {
      console.log('🎤 録音開始...')
      setError('')
      setTranscription('')
      setResponse('')
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      // MediaRecorder設定（安全な形式）
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

      // 音声ファイル作成（録音用）
      const recordedAudioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      setAudioSize(recordedAudioBlob.size)
      console.log('📊 音声ファイルサイズ:', recordedAudioBlob.size, 'bytes')

      if (recordedAudioBlob.size === 0) {
        throw new Error('音声データが空です')
      }

      // FormData作成（安全な送信方法）
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
      setTranscription(transcribedText)

      if (!transcribedText.trim()) {
        throw new Error('音声が認識されませんでした')
      }

      // Chat API呼び出し（安全なJSON送信）
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

      // 音声データを受信
      const audioArrayBuffer = await chatResponse.arrayBuffer()
      console.log('🎵 AI音声受信:', audioArrayBuffer.byteLength, 'bytes')
      
      if (audioArrayBuffer.byteLength === 0) {
        throw new Error('AI音声データが空です')
      }

      // 音声再生（再生用）
      const playbackAudioBlob = new Blob([audioArrayBuffer], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(playbackAudioBlob)
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl
        await audioRef.current.play()
        console.log('🔊 AI音声再生開始')
      }

      setResponse('AI音声応答を再生中...')

    } catch (error) {
      console.error('❌ 処理エラー詳細:', error)
      setError(`処理エラー: ${error}`)
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

  return (
    <div className="flex flex-col items-center space-y-6 p-8">
      <h1 className="text-3xl font-bold text-gray-800">🎤 AI音声チャット</h1>
      
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={toggleRecording}
          disabled={isProcessing}
          className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold transition-all duration-200 ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
              : isProcessing
              ? 'bg-yellow-500 text-white cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isProcessing ? '⏳' : isRecording ? '⏹️' : '🎤'}
        </button>
        
        <p className="text-sm text-gray-600">
          {isProcessing ? '処理中...' : isRecording ? '録音中 - クリックで停止' : 'クリックで録音開始'}
        </p>
      </div>

      {audioSize > 0 && (
        <div className="text-sm text-blue-600">
          音声: {(audioSize / 1024).toFixed(1)}KB / 文字: {transcription.length}
        </div>
      )}

      {transcription && (
        <div className="max-w-2xl w-full p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">👤 あなた:</h3>
          <p className="text-blue-700">{transcription}</p>
        </div>
      )}

      {response && (
        <div className="max-w-2xl w-full p-4 bg-green-50 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">🤖 AI:</h3>
          <p className="text-green-700">{response}</p>
        </div>
      )}

      {error && (
        <div className="max-w-2xl w-full p-4 bg-red-50 rounded-lg">
          <h3 className="font-semibold text-red-800 mb-2">❌ エラー:</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <audio ref={audioRef} className="hidden" />
    </div>
  )
}
