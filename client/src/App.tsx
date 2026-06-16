import { useState, useRef, useEffect } from 'react'
import { Button, Input, Spin, Tooltip } from 'antd'
import {
  SendOutlined, PlusOutlined, RobotOutlined,
  UserOutlined, DeleteOutlined, LogoutOutlined,
} from '@ant-design/icons'
import { marked } from 'marked'
import { v4 as uuidv4 } from 'uuid'
import Login from './pages/Login'
import './App.css'

const API_BASE = 'http://localhost:8000'

interface Message { role: 'user' | 'assistant'; content: string }
interface Session { id: string; title: string; messages: Message[] }
interface AuthState { token: string; username: string }

const newSession = (): Session => ({ id: uuidv4(), title: '新对话', messages: [] })

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const token = localStorage.getItem('token')
    const username = localStorage.getItem('username')
    return token && username ? { token, username } : null
  })
  const [sessions, setSessions] = useState<Session[]>([newSession()])
  const [activeId, setActiveId] = useState<string>(sessions[0].id)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const activeSession = sessions.find(s => s.id === activeId)!
  const messages = activeSession?.messages ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const login = (token: string, username: string) => {
    localStorage.setItem('token', token)
    localStorage.setItem('username', username)
    setAuth({ token, username })
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    setAuth(null)
  }

  if (!auth) return <Login onLogin={login} />

  const updateSession = (id: string, msgs: Message[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== id) return s
      const first = msgs.find(m => m.role === 'user')
      return { ...s, messages: msgs, title: first ? first.content.slice(0, 18) : s.title }
    }))
  }

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const userMsg: Message = { role: 'user', content: text }
    const history = [...messages, userMsg]
    updateSession(activeId, [...history, { role: 'assistant', content: '' }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ session_id: activeId, messages: history }),
      })
      if (res.status === 401) { logout(); return }
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
              const token = JSON.parse(data)
              setSessions(prev => prev.map(s => {
                if (s.id !== activeId) return s
                const msgs = [...s.messages]
                const last = msgs[msgs.length - 1]
                msgs[msgs.length - 1] = { ...last, content: last.content + token }
                return { ...s, messages: msgs }
              }))
            } catch { }
          }
        }
      }
    } catch {
      setSessions(prev => prev.map(s => {
        if (s.id !== activeId) return s
        const msgs = [...s.messages]
        msgs[msgs.length - 1] = { role: 'assistant', content: '请求出错，请确认后端已启动。' }
        return { ...s, messages: msgs }
      }))
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault(); send()
    }
  }

  const addSession = () => {
    const s = newSession()
    setSessions(prev => [s, ...prev])
    setActiveId(s.id)
  }

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id)
      if (next.length === 0) { const f = newSession(); setActiveId(f.id); return [f] }
      if (id === activeId) setActiveId(next[0].id)
      return next
    })
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-top">
          <span className="logo">✦ AI 助手</span>
          <Tooltip title="新对话" placement="right">
            <Button type="text" icon={<PlusOutlined />} onClick={addSession} className="new-btn" />
          </Tooltip>
        </div>
        <div className="session-list">
          {sessions.map(s => (
            <div
              key={s.id}
              className={`session-item ${s.id === activeId ? 'active' : ''}`}
              onClick={() => setActiveId(s.id)}
            >
              <span className="session-title">{s.title}</span>
              <DeleteOutlined className="session-del" onClick={e => deleteSession(s.id, e)} />
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <span className="sidebar-user">{auth.username}</span>
          <Tooltip title="退出登录" placement="right">
            <Button
              type="text" icon={<LogoutOutlined />}
              onClick={logout}
              className="logout-btn"
            />
          </Tooltip>
        </div>
      </aside>

      <div className="main">
        <div className="messages">
          {messages.length === 0 && (
            <div className="empty">
              <div className="empty-icon"><RobotOutlined /></div>
              <p className="empty-title">有什么可以帮你的？</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`msg-row ${msg.role}`}>
              <div className={`avatar ${msg.role}`}>
                {msg.role === 'assistant' ? <RobotOutlined /> : <UserOutlined />}
              </div>
              <div className="bubble">
                {msg.content
                  ? <div dangerouslySetInnerHTML={{ __html: marked(msg.content) as string }} />
                  : msg.role === 'assistant' && loading && i === messages.length - 1
                    ? <Spin size="small" /> : null}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="input-wrap">
          <div className="input-area">
            <Input.TextArea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="输入消息…  Enter 发送  Shift+Enter 换行"
              autoSize={{ minRows: 1, maxRows: 6 }}
              disabled={loading}
              bordered={false}
              className="input-box"
            />
            <Button
              type="primary" shape="circle" icon={<SendOutlined />}
              onClick={send} loading={loading} disabled={!input.trim()}
              className="send-btn"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
