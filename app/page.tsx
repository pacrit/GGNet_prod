"use client"

import { useState } from "react"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import AuthContainer from "./components/Auth/AuthContainer"
import Header from "./components/Navigation/Header"
import Feed from "./components/Feed/Feed"
import Dashboard from "./components/Dashboard/Dashboard"
import ChatDrawer from "./components/Chat/ChatDrawer"

function AppContent() {
  const { currentUser } = useAuth()
  const [currentPage, setCurrentPage] = useState<"feed" | "friends">("feed")
  const [chatDrawer, setChatDrawer] = useState({
    isOpen: false,
    recipientId: null as number | null,
    recipientName: null as string | null,
  })

  const openChat = (recipientId: number, recipientName: string) => {
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
      <Header onNavigate={setCurrentPage} currentPage={currentPage} />

      <main className="app-main">{currentPage === "feed" ? <Feed /> : <Dashboard onOpenChat={openChat} />}</main>

      <ChatDrawer
        isOpen={chatDrawer.isOpen}
        onClose={closeChat}
        recipientId={chatDrawer.recipientId}
        recipientName={chatDrawer.recipientName}
      />
    </div>
  )
}

export default function HomePage() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
