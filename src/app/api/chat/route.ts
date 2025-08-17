import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  console.log('=== 🔍 DEBUG START ===');
  
  try {
    // ステップ1: リクエスト解析
    console.log('ステップ1: リクエスト解析開始');
    const { message } = await request.json();
    console.log('ステップ1完了: メッセージ受信 =', message);

    if (!message) {
      console.log('エラー: メッセージが空');
      return NextResponse.json({ error: 'メッセージが必要です' }, { status: 400 });
    }

    // ステップ2: API Key確認
    console.log('ステップ2: API Key確認開始');
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('ステップ2: API Key存在 =', !!apiKey);
    console.log('ステップ2: API Key先頭 =', apiKey ? apiKey.substring(0, 10) + '...' : 'なし');
    
    if (!apiKey) {
      console.log('エラー: API Key未設定');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // ステップ3: OpenAI初期化
    console.log('ステップ3: OpenAI初期化開始');
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    console.log('ステップ3完了: OpenAI初期化成功');

    // ステップ4: Chat Completion（簡略版）
    console.log('ステップ4: Chat Completion開始');
    console.log('使用モデル: gpt-4o');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "あなたは日本語で応答するAIです。簡潔に回答してください。"
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 300 // デバッグ用に短縮
    });
    
    const reply = completion.choices[0]?.message?.content || 'エラー: 応答生成失敗';
    console.log('ステップ4完了: テキスト生成成功 =', reply);

    // ステップ5: 音声生成（デバッグ版）
    console.log('ステップ5: 音声生成開始');
    console.log('音声モデル: tts-1, 音声: nova');
    
    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: reply,
      speed: 1.0, // デバッグ用に標準速度
      response_format: "mp3"
    });
    
    console.log('ステップ5完了: 音声生成成功');

    // ステップ6: レスポンス作成
    console.log('ステップ6: レスポンス作成開始');
    const arrayBuffer = await speech.arrayBuffer();
    console.log('ステップ6: ArrayBuffer取得 =', arrayBuffer.byteLength, 'bytes');
    
    const buffer = Buffer.from(arrayBuffer);
    console.log('ステップ6完了: Buffer作成 =', buffer.length, 'bytes');

    console.log('=== ✅ DEBUG SUCCESS ===');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error) {
    console.log('=== ❌ DEBUG ERROR ===');
    console.error('エラータイプ:', typeof error);
    console.error('エラー内容:', error);
    
    if (error instanceof Error) {
      console.error('Error.name:', error.name);
      console.error('Error.message:', error.message);
      console.error('Error.stack:', error.stack);
    }
    
    // OpenAI APIエラーの詳細
    if (error && typeof error === 'object') {
      const errorObj = error as any;
      if ('status' in errorObj) {
        console.error('OpenAI Status:', errorObj.status);
      }
      if ('code' in errorObj) {
        console.error('OpenAI Code:', errorObj.code);
      }
      if ('error' in errorObj) {
        console.error('OpenAI Error:', errorObj.error);
      }
      if ('response' in errorObj) {
        console.error('OpenAI Response:', errorObj.response);
      }
    }

    console.log('=== DEBUG ERROR END ===');

    return NextResponse.json(
      { 
        error: 'デバッグ: 音声生成エラー',
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : 'Unknown',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

