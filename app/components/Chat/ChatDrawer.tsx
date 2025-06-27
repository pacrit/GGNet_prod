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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { currentUser, token } = useAuth()

  useEffect(() => {
    if (isOpen && recipientId && token) {
      fetchMessages()
      // Polling para mensagens em tempo real
      const interval = setInterval(fetchMessages, 2000)
      return () => clearInterval(interval)
    }
  }, [isOpen, recipientId, token])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    if (!token || !recipientId) return

    try {
      const response = await fetch(`/api/messages?recipientId=${recipientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const messagesData = await response.json()
        setMessages(messagesData)
      }
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || loading || !token || !recipientId) return

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
          content: newMessage.trim(),
        }),
      })

      if (response.ok) {
        setNewMessage("")
        fetchMessages() // Atualizar mensagens
      }
    } catch (error) {
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
    <div className="chat-drawer-overlay">
      <div className="chat-drawer">
        <div className="chat-header">
          <h3>Chat com {recipientName}</h3>
          <button onClick={onClose} className="close-button">
            ×
          </button>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="no-messages">Nenhuma mensagem ainda. Comece a conversa!</div>
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
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            disabled={loading}
            className="chat-input"
          />
          <button type="submit" disabled={loading || !newMessage.trim()} className="send-button">
            {loading ? "..." : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  )
}
