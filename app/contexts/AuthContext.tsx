"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: number;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    displayName: string,
    categories: number[],
    avatarUrl?: string
  ) => Promise<void>;
  logout: () => void;
  updateUser: (userData: User) => void; // 🆕 Adicionar updateUser
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se há um token salvo
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Erro ao parsear usuário salvo:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro no login");
    }

    setToken(data.token);
    setCurrentUser(data.user);

    // Salvar no localStorage
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  };

  const signup = async (
    email: string,
    password: string,
    displayName: string,
    categories: number[],
    avatarUrl?: string
  ) => {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        displayName,
        categories,
        avatarUrl,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro no cadastro");
    }

    setToken(data.token);
    setCurrentUser(data.user);

    // Salvar no localStorage
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  };

  // 🆕 Função para atualizar dados do usuário
  const updateUser = (userData: User) => {
    setCurrentUser(userData);
    // Atualizar localStorage também
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const value = {
    currentUser,
    token,
    login,
    signup,
    logout,
    updateUser, // 🆕 Adicionar à interface
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
