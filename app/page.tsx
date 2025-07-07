"use client"

import { useState } from "react"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import AuthContainer from "./components/Auth/AuthContainer"
import Header from "./components/Navigation/Header"
import Feed from "./components/Feed/Feed"
import SquadPage from "./components/Squad/SquadPage"
import Dashboard from "./components/Dashboard/Dashboard"
import ChatDrawer from "./components/Chat/ChatDrawer"

// Definir o tipo das páginas em um lugar central
type PageType = "feed" | "squad" | "friends";

function AppContent() {
  const { currentUser, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageType>("feed");
  const [chatDrawer, setChatDrawer] = useState<{
    isOpen: boolean;
    recipientId: number | null;
    recipientName: string | null;
  }>({
    isOpen: false,
    recipientId: null,
    recipientName: null,
  });

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

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "feed":
        return <Feed />;
      case "squad":
        return <SquadPage />;
      case "friends":
        return <Dashboard onOpenChat={openChat} />;
      default:
        return <Feed />;
    }
  };

  if (!currentUser) {
    return <AuthContainer />;
  }

  return (
    <div className="app">
      <Header onNavigate={setCurrentPage} currentPage={currentPage} />
      <main className="app-main">
        {renderCurrentPage()}
      </main>
      <ChatDrawer
        isOpen={chatDrawer.isOpen}
        onClose={closeChat}
        recipientId={chatDrawer.recipientId}
        recipientName={chatDrawer.recipientName}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
