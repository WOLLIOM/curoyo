'use client'

import SnakeGame from '@/components/SnakeGame'

// A missing page is a lost snake. Feed it, or go home.
export default function NotFound() {
  return (
    <main className="min-h-[100svh]">
      <p className="fixed inset-x-0 top-8 z-[90] text-center text-[15px] font-bold" style={{ color: 'var(--muted)' }}>
        404: this page slithered off.
      </p>
      <SnakeGame onClose={() => (window.location.href = '/')} />
    </main>
  )
}
