"use client"

import { useState } from "react"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import AuthContainer from "./components/Auth/AuthContainer"
import Dashboard from "./components/Dashboard/Dashboard"
import ChatDrawer from "./components/Chat/ChatDrawer"
import "./App.css"

function AppContent() {
  const { currentUser, logout } = useAuth()
  const [chatDrawer, setChatDrawer] = useState({
    isOpen: false,
    recipientId: null,
    recipientName: null,
  })

  const openChat = (recipientId, recipientName) => {
    setChatDrawer({
      isOpen: true,
      recipientId,
      recipientName,
    })
  }

  const closeChat = () => {
    setChatDrawer({
      isOpen: false,
      recipientId: null,
      recipientName: null,
    })
  }

  if (!currentUser) {
    return <AuthContainer />
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>GG Networking</h1>
          <div className="user-info">
            <span>Olá, {currentUser.displayName || currentUser.email}</span>
            <button onClick={logout} className="logout-btn">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <Dashboard onOpenChat={openChat} />
      </main>

      <ChatDrawer
        isOpen={chatDrawer.isOpen}
        onClose={closeChat}
        recipientId={chatDrawer.recipientId}
        recipientName={chatDrawer.recipientName}
      />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
