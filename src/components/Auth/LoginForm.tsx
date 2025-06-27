"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import DemoUsers from "./DemoUsers"

interface LoginFormProps {
  onToggleForm: () => void
}

export default function LoginForm({ onToggleForm }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setError("")
      setLoading(true)
      await login(email, password)
    } catch (error: any) {
      setError(error.message)
    }

    setLoading(false)
  }

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail)
    setPassword(demoPassword)

    try {
      setError("")
      setLoading(true)
      await login(demoEmail, demoPassword)
    } catch (error: any) {
      setError(error.message)
    }

    setLoading(false)
  }

  return (
    <div className="auth-form">
      <h2>Login</h2>
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="form-group">
          <label htmlFor="password">Senha</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="toggle-form">
        Não tem uma conta?
        <button onClick={onToggleForm} className="link-button">
          Cadastre-se
        </button>
      </p>
    </div>
  )
}
