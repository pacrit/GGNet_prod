"use client"

import { useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import "./AuthForms.css"

export default function SignupForm({ onToggleForm }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const { signup, loginWithGoogle } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()

    if (password !== confirmPassword) {
      return setError("As senhas não coincidem")
    }

    if (password.length < 6) {
      return setError("A senha deve ter pelo menos 6 caracteres")
    }

    try {
      setError("")
      setLoading(true)
      await signup(email, password, displayName)
    } catch (error) {
      setError("Falha ao criar conta: " + error.message)
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
      <h2>Cadastro</h2>
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="displayName">Nome</label>
          <input
            type="text"
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>

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

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirmar Senha</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Criando conta..." : "Cadastrar"}
        </button>
      </form>

      <div className="divider">ou</div>

      <button onClick={handleGoogleLogin} disabled={loading} className="btn-google">
        <img src="/google-icon.svg" alt="Google" />
        Cadastrar com Google
      </button>

      <p className="toggle-form">
        Já tem uma conta?
        <button onClick={onToggleForm} className="link-button">
          Faça login
        </button>
      </p>
    </div>
  )
}
