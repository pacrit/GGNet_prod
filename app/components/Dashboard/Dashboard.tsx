"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../contexts/AuthContext"
import UserCard from "./UserCard"

interface DashboardProps {
  onOpenChat: (recipientId: number, recipientName: string) => void
}

interface UserData {
  id: number
  email: string
  display_name: string
  avatar_url?: string
  created_at: string
}

export default function Dashboard({ onOpenChat }: DashboardProps) {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const { token } = useAuth()

  useEffect(() => {
    fetchUsers()
  }, [token])

  const fetchUsers = async () => {
    if (!token) return

    try {
      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const usersData = await response.json()
        setUsers(usersData)
      }
    } catch (error) {
      console.error("Erro ao buscar usuários:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Carregando usuários...</div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Conecte-se com outros profissionais</h2>
        <p>Encontre e converse com pessoas da sua área</p>
      </div>

      <div className="users-grid">
        {users.length === 0 ? (
          <div className="no-users">
            <p>Nenhum usuário encontrado.</p>
            <p>Seja o primeiro a se conectar!</p>
          </div>
        ) : (
          users && users.map((user) => <UserCard key={user.id} user={user} onOpenChat={(id, name) => onOpenChat(id, name)} />)
        )}
      </div>
    </div>
  )
}
