import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log('🎤 音声認識API呼び出し開始');
    
    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ OPENAI_API_KEY が設定されていません');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      console.log('❌ 音声ファイルがありません');
      return NextResponse.json({ error: '音声ファイルが必要です' }, { status: 400 });
    }

    console.log('📊 音声ファイル情報:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    });

    if (audioFile.size === 0) {
      console.log('❌ 音声ファイルが空です');
      return NextResponse.json({ error: '音声ファイルが空です' }, { status: 400 });
    }

    console.log('🔄 Whisper API呼び出し中...');
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ja'
    });

    const transcribedText = transcription.text;
    console.log('✅ 音声認識成功:', transcribedText);

    return NextResponse.json({
      text: transcribedText,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 音声認識エラー:', error);
    return NextResponse.json(
      { 
        error: '音声認識中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
