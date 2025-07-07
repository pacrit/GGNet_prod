"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";

interface ChatMessage {
  id: number;
  message: string;
  created_at: string;
  user_id: number;
  display_name: string;
  avatar_url?: string;
}

interface SquadChatProps {
  squadId: number;
  squadName: string;
  onBack: () => void;
}

export default function SquadChat({ squadId, squadName, onBack }: SquadChatProps) {
  const { currentUser, token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (squadId && token) {
      fetchMessages();
      
      // Polling para mensagens novas a cada 3 segundos
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [squadId, token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/squads/${squadId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setMessages(data.messages);
      } else {
        setError(data.error || "Erro ao carregar mensagens");
      }
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
      if (loading) {
        setError("Erro ao carregar chat");
      }
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;

    setSending(true);
    setError("");

    try {
      const response = await fetch(`/api/squads/${squadId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: newMessage.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        setNewMessage("");
        
        // Focar no textarea novamente
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      } else {
        setError(data.error || "Erro ao enviar mensagem");
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setError("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "agora";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e as any);
    }
  };

  if (loading) {
    return (
      <div className="chat-container">
        <div className="chat-header">
          <button className="chat-back-btn" onClick={onBack}>
            ← Voltar
          </button>
          <h2>💬 Chat - {squadName}</h2>
        </div>
        <div className="chat-loading">
          <div className="loading-spinner"></div>
          <p>Carregando chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button className="chat-back-btn" onClick={onBack}>
          ← Voltar
        </button>
        <h2>💬 Chat - {squadName}</h2>
        <div className="chat-status">
          <span className="online-indicator"></span>
          Online
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            <div className="no-messages-icon">💬</div>
            <h3>Nenhuma mensagem ainda</h3>
            <p>Seja o primeiro a enviar uma mensagem no chat!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.user_id === currentUser?.id;
            const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id;
            
            return (
              <div
                key={message.id}
                className={`message ${isOwnMessage ? 'own-message' : 'other-message'}`}
              >
                {showAvatar && !isOwnMessage && (
                  <img
                    src={message.avatar_url || "/placeholder-user.jpg"}
                    alt={message.display_name}
                    className="message-avatar"
                  />
                )}
                <div className="message-content">
                  {showAvatar && !isOwnMessage && (
                    <div className="message-header">
                      <span className="message-author">{message.display_name}</span>
                      <span className="message-time">{formatTime(message.created_at)}</span>
                    </div>
                  )}
                  <div className="message-text">{message.message}</div>
                  {isOwnMessage && (
                    <div className="message-time own-time">
                      {formatTime(message.created_at)}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="chat-error">
          {error}
        </div>
      )}

      <form className="chat-input-form" onSubmit={sendMessage}>
        <div className="chat-input-container">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            className="chat-input"
            rows={1}
            maxLength={1000}
            disabled={sending}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <div className="mini-spinner"></div>
            ) : (
              "📤"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}