'use client'

import VoiceChat from '@/components/VoiceChat'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          🎤 AI音声チャット
        </h1>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <VoiceChat />
        </div>
      </div>
    </main>
  )
}
