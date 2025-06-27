"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "../../contexts/AuthContext"

interface SignupFormProps {
  onToggleForm: () => void
}

export default function SignupForm({ onToggleForm }: SignupFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const { signup } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    console.log(email)
    console.log(password)
    console.log(displayName)
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
    } catch (error: any) {
      setError(error.message)
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

      <p className="toggle-form">
        Já tem uma conta?
        <button onClick={onToggleForm} className="link-button">
          Faça login
        </button>
      </p>
    </div>
  )
}
