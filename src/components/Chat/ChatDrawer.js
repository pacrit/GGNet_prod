"use client"

import { useState, useEffect, useRef } from "react"
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore"
import { db } from "../../firebase/config"
import { useAuth } from "../../contexts/AuthContext"
import "./ChatDrawer.css"

export default function ChatDrawer({ isOpen, onClose, recipientId, recipientName }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const { currentUser } = useAuth()

  const chatId = [currentUser?.uid, recipientId].sort().join("_")

  useEffect(() => {
    if (!isOpen || !currentUser || !recipientId) return

    const messagesRef = collection(db, "chats", chatId, "messages")
    const q = query(messagesRef, orderBy("timestamp", "asc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setMessages(messagesData)
    })

    return () => unsubscribe()
  }, [isOpen, currentUser, recipientId, chatId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || loading) return

    setLoading(true)
    try {
      const messagesRef = collection(db, "chats", chatId, "messages")
      await addDoc(messagesRef, {
        text: newMessage.trim(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email,
        timestamp: serverTimestamp(),
        read: false,
      })

      // Atualizar informações do chat
      const chatRef = collection(db, "chats")
      await addDoc(chatRef, {
        participants: [currentUser.uid, recipientId],
        lastMessage: newMessage.trim(),
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      setNewMessage("")
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error)
    }
    setLoading(false)
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
              <div key={message.id} className={`message ${message.senderId === currentUser.uid ? "sent" : "received"}`}>
                <div className="message-content">
                  <p>{message.text}</p>
                  <span className="message-time">
                    {message.timestamp?.toDate?.()?.toLocaleTimeString() || "Enviando..."}
                  </span>
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
