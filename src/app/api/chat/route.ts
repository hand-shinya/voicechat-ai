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

    // ステップ2: GPT-3.5で完全な日本語応答生成（トークン数大幅増加）
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
      max_tokens: 200,  // 60→200に大幅増加
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

    // ステップ3: TTS APIで高品質日本語音声生成（設定最適化）
    const speechResponse = await openai.audio.speech.create({
      model: 'tts-1-hd',  // tts-1 → tts-1-hd（高音質）
      voice: 'alloy',
      input: assistantText,
      speed: 0.9,  // 1.0 → 0.9（やや遅く、明瞭に）
      response_format: 'mp3'  // 明示的にMP3指定
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
