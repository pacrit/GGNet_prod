"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "../../firebase/config"
import { useAuth } from "../../contexts/AuthContext"
import UserCard from "./UserCard"
import "./Dashboard.css"

export default function Dashboard({ onOpenChat }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const { currentUser } = useAuth()

  useEffect(() => {
    fetchUsers()
  }, [currentUser])

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, "users")
      const q = query(usersRef, where("uid", "!=", currentUser.uid))
      const querySnapshot = await getDocs(q)

      const usersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      setUsers(usersData)
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
          users.map((user) => <UserCard key={user.id} user={user} onOpenChat={onOpenChat} />)
        )}
      </div>
    </div>
  )
}
