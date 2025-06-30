"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "../../contexts/AuthContext"

interface ChatDrawerProps {
  isOpen: boolean
  onClose: () => void
  recipientId: number | null
  recipientName: string | null
}

interface Message {
  id: number
  chat_id: number
  sender_id: number
  content: string
  created_at: string
  sender_name: string
}

export default function ChatDrawer({ isOpen, onClose, recipientId, recipientName }: ChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { currentUser, token } = useAuth()

  // Buscar mensagens quando o chat abrir
  useEffect(() => {
    if (isOpen && recipientId && token) {
      fetchMessages()
      // Polling para mensagens em tempo real (a cada 3 segundos)
      const interval = setInterval(fetchMessages, 3000)
      return () => clearInterval(interval)
    }
  }, [isOpen, recipientId, token])

  // Scroll automático para a última mensagem
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    if (!token || !recipientId) return

    setChatLoading(true)
    try {
      const response = await fetch(`/api/messages?recipientId=${recipientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      } else {
        console.error("Erro ao buscar mensagens:", response.status)
      }
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error)
    } finally {
      setChatLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || loading || !token || !recipientId) return

    const messageContent = newMessage.trim()
    setNewMessage("")
    setLoading(true)

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientId,
          content: messageContent,
        }),
      })

      if (response.ok) {
        // Buscar mensagens atualizadas
        await fetchMessages()
      } else {
        // Se falhar, restaurar a mensagem
        setNewMessage(messageContent)
        console.error("Erro ao enviar mensagem:", response.status)
      }
    } catch (error) {
      // Se falhar, restaurar a mensagem
      setNewMessage(messageContent)
      console.error("Erro ao enviar mensagem:", error)
    }
    setLoading(false)
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (!isOpen) return null

  return (
    <div className="chat-drawer-overlay" onClick={onClose}>
      <div className="chat-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="chat-header">
          <div className="chat-user-info">
            <div className="chat-avatar">
              <div className="avatar-placeholder">{recipientName?.charAt(0).toUpperCase()}</div>
            </div>
            <div>
              <h3>{recipientName}</h3>
              <span className="chat-status">Online</span>
            </div>
          </div>
          <button onClick={onClose} className="close-button">
            ✕
          </button>
        </div>

        <div className="chat-messages">
          {chatLoading && messages.length === 0 ? (
            <div className="chat-loading">
              <div className="loading-spinner"></div>
              <p>Carregando mensagens...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="no-messages">
              <p>Nenhuma mensagem ainda.</p>
              <p>Comece a conversa! 👋</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.sender_id === currentUser?.id ? "sent" : "received"}`}
              >
                <div className="message-content">
                  <p>{message.content}</p>
                  <span className="message-time">{formatTime(message.created_at)}</span>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="chat-input-form">
          <div className="chat-input-container">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              disabled={loading}
              className="chat-input"
              maxLength={500}
            />
            <button type="submit" disabled={loading || !newMessage.trim()} className="send-button">
              {loading ? "..." : "📤"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
