import { useState, useRef, useEffect } from 'react'
import { Button, Input, Spin } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import { marked } from 'marked'
import './App.css'

const API_BASE = 'http://localhost:8000'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const history = [...messages, userMsg]
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          if (data) {
            try {
              const text = JSON.parse(data)
              setMessages(prev => {
                const last = prev[prev.length - 1]
                return [...prev.slice(0, -1), { ...last, content: last.content + text }]
              })
            } catch { /* 跳过解析失败的 chunk */ }
          }
        }
      }
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: '出错了，请确认后端已启动。' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="chat-layout">
      <header className="chat-header">
        <span className="chat-title">AI 助手</span>
      </header>

      <main className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">发送消息开始对话</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`message-row ${msg.role}`}>
            <div className="message-bubble">
              {msg.content
                ? <div dangerouslySetInnerHTML={{ __html: marked(msg.content) as string }} />
                : msg.role === 'assistant' && loading && i === messages.length - 1
                  ? <Spin size="small" />
                  : null}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      <footer className="chat-input-area">
        <Input.TextArea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="输入消息，Enter 发送，Shift+Enter 换行"
          autoSize={{ minRows: 1, maxRows: 5 }}
          disabled={loading}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={send}
          loading={loading}
          disabled={!input.trim()}
        />
      </footer>
    </div>
  )
}
