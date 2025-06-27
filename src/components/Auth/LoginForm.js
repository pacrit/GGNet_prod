"use client"

import { useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import "./AuthForms.css"

export default function LoginForm({ onToggleForm }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const { login, loginWithGoogle } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()

    try {
      setError("")
      setLoading(true)
      await login(email, password)
    } catch (error) {
      setError("Falha ao fazer login: " + error.message)
    }

    setLoading(false)
  }

  async function handleGoogleLogin() {
    try {
      setError("")
      setLoading(true)
      await loginWithGoogle()
    } catch (error) {
      setError("Falha ao fazer login com Google: " + error.message)
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

      <div className="divider">ou</div>

      <button onClick={handleGoogleLogin} disabled={loading} className="btn-google">
        <img src="/google-icon.svg" alt="Google" />
        Entrar com Google
      </button>

      <p className="toggle-form">
        Não tem uma conta?
        <button onClick={onToggleForm} className="link-button">
          Cadastre-se
        </button>
      </p>
    </div>
  )
}
