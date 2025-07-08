// filepath: c:\personal\GGNet_prod\app\page.tsx
"use client"

import { useState } from "react"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import AuthContainer from "./components/Auth/AuthContainer"
import Header from "./components/Navigation/Header"
import Feed from "./components/Feed/Feed"
import SquadPage from "./components/Squad/SquadPage"
import Dashboard from "./components/Dashboard/Dashboard"
import ChatDrawer from "./components/Chat/ChatDrawer"
import PWAProvider from "./components/PWA/PWAProvider" // 🆕
import InstallPrompt from "./components/PWA/InstallPrompt" // 🆕
import { usePWA } from "./hooks/usePWA" // 🆕

type PageType = "feed" | "squad" | "friends";

function AppContent() {
  const { currentUser } = useAuth();
  const { isOnline } = usePWA(); // 🆕
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
      {/* 🆕 Indicador offline */}
      {!isOnline && (
        <div style={{
          background: '#ff4d4f',
          color: '#fff',
          padding: '8px',
          textAlign: 'center',
          fontSize: '14px',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
        }}>
          📡 Você está offline
        </div>
      )}

      <Header onNavigate={setCurrentPage} currentPage={currentPage} />
      <main className="app-main" style={{ marginTop: !isOnline ? '40px' : '0' }}>
        {renderCurrentPage()}
      </main>
      
      <ChatDrawer
        isOpen={chatDrawer.isOpen}
        onClose={closeChat}
        recipientId={chatDrawer.recipientId}
        recipientName={chatDrawer.recipientName}
      />

      {/* 🆕 Prompt de instalação */}
      <InstallPrompt />
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthProvider>
      <PWAProvider> {/* 🆕 */}
        <AppContent />
      </PWAProvider>
    </AuthProvider>
  )
}