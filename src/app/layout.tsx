import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI音声チャット',
  description: 'OpenAI音声APIを使用したリアルタイム音声チャット',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
