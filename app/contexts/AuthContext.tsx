"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  id: number
  email: string
  displayName: string
  avatarUrl?: string
}

interface AuthContextType {
  currentUser: User | null
  signup: (email: string, password: string, displayName: string, avatarUrl?: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  token: string | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar se há token salvo no localStorage
    if (typeof window !== "undefined") {
      try {
        const savedToken = localStorage.getItem("auth_token")
        const savedUser = localStorage.getItem("auth_user")

        if (savedToken && savedUser) {
          const userData = JSON.parse(savedUser)

          // Validar estrutura dos dados salvos
          if (userData.id && userData.email && userData.displayName) {
            setToken(savedToken)
            setCurrentUser(userData)
          } else {
            // Dados inválidos, limpar
            localStorage.removeItem("auth_token")
            localStorage.removeItem("auth_user")
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados salvos:", error)
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token")
          localStorage.removeItem("auth_user")
        }
      }
    }

    setLoading(false)
  }, [])

  // Função para salvar dados de autenticação
  const saveAuthData = (token: string, user: User) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("auth_token", token)
        localStorage.setItem("auth_user", JSON.stringify(user))
        setToken(token)
        setCurrentUser(user)
      } catch (error) {
        console.error("Erro ao salvar dados de autenticação:", error)
        throw new Error("Falha ao salvar dados de autenticação")
      }
    }
  }

  // Função para fazer requisições com melhor tratamento de erro
  const makeAuthRequest = async (url: string, data: any) => {
    try {
      console.log("Fazendo requisição para:", url, "com dados:", { ...data, password: "***" })
      console.log('Data: ', data)

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      console.log("Status da resposta:", response.status)
      console.log("Headers da resposta:", Object.fromEntries(response.headers.entries()))

      // Verificar se a resposta é JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Resposta não é JSON. Content-Type:", contentType)
        const textResponse = await response.text()
        console.error("Resposta como texto:", textResponse)
        throw new Error("Resposta inválida do servidor (não é JSON)")
      }

      const responseData = await response.json()
      console.log("Dados da resposta:", { ...responseData, token: responseData.token ? "***" : undefined })

      if (!response.ok) {
        console.error("Resposta com erro:", responseData)
        throw new Error(responseData.error || `Erro ${response.status}: ${response.statusText}`)
      }

      // Validar estrutura da resposta
      if (!responseData.token) {
        console.error("Token ausente na resposta:", responseData)
        throw new Error("Token ausente na resposta do servidor")
      }

      if (!responseData.user) {
        console.error("Dados do usuário ausentes na resposta:", responseData)
        throw new Error("Dados do usuário ausentes na resposta do servidor")
      }

      if (!responseData.user.id || !responseData.user.email || !responseData.user.displayName) {
        console.error("Estrutura do usuário inválida:", responseData.user)
        throw new Error("Estrutura do usuário inválida na resposta do servidor")
      }

      return responseData
    } catch (error) {
      console.error("Erro na requisição:", error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error("Erro de conexão com o servidor")
    }
  }

  // Cadastro
  async function signup(email: string, password: string, displayName: string, avatarUrl?: string) {
    try {
      // Validações básicas
      if (!email || !password || !displayName) {
        throw new Error("Todos os campos são obrigatórios")
      }

      if (password.length < 6) {
        throw new Error("A senha deve ter pelo menos 6 caracteres")
      }

      console.log("Iniciando cadastro para:", email)

      const data = await makeAuthRequest("/api/auth/register", {
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        avatar_url: avatarUrl,
      })

      console.log("Cadastro bem-sucedido, salvando dados...")
      saveAuthData(data.token, data.user)
    } catch (error) {
      console.error("Erro no signup:", error)
      throw error
    }
  }

  // Login
  async function login(email: string, password: string) {
    try {
      // Validações básicas
      if (!email || !password) {
        throw new Error("Email e senha são obrigatórios")
      }

      console.log("Iniciando login para:", email)

      const data = await makeAuthRequest("/api/auth/login", {
        email: email.trim(),
        password,
      })

      console.log("Login bem-sucedido, salvando dados...")
      saveAuthData(data.token, data.user)
    } catch (error) {
      console.error("Erro no login:", error)
      throw error
    }
  }

  // Logout
  function logout() {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("auth_token")
        localStorage.removeItem("auth_user")
      } catch (error) {
        console.error("Erro ao limpar dados de autenticação:", error)
      }
    }
    setToken(null)
    setCurrentUser(null)
  }

  const value = {
    currentUser,
    signup,
    login,
    logout,
    token,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
