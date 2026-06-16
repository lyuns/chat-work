import { useState } from 'react'
import { Form, Input, Button, message } from 'antd'
import { UserOutlined, LockOutlined, RobotOutlined } from '@ant-design/icons'
import { sha256 } from '../utils/crypto'

interface Props {
  onLogin: (token: string, username: string) => void
}

const API_BASE = 'http://localhost:8000'

export default function Login({ onLogin }: Props) {
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const hashedPassword = await sha256(values.password)
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: values.username, password: hashedPassword }),
      })
      const json = await res.json()
      if (json.ret !== 0) {
        message.error(json.msg || '登录失败')
        return
      }
      onLogin(json.data.token, json.data.username)
    } catch {
      message.error('网络异常，请确认后端已启动')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <RobotOutlined />
        </div>
        <h2 className="login-title">AI 助手</h2>
        <p className="login-sub">登录以开始对话</p>
        <Form onFinish={onFinish} autoComplete="off" size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}
