"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Drawer, 
  Input, 
  Button, 
  Avatar, 
  Space, 
  Typography, 
  Spin,
  Badge,
  Divider,
  message as antMessage
} from "antd";
import { 
  SendOutlined, 
  UserOutlined, 
  MessageOutlined,
  CloseOutlined 
} from "@ant-design/icons";
import { useAuth } from "../../contexts/AuthContext";

const { Text, Title } = Typography;
const { TextArea } = Input;

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: number | null;
  recipientName: string | null;
  recipientAvatar?: string | null;
}

interface Message {
  id: number;
  chat_id: number;
  sender_id: number;
  content: string;
  created_at: string;
  sender_name: string;
}

export default function ChatDrawer({ 
  isOpen, 
  onClose, 
  recipientId, 
  recipientName,
  recipientAvatar 
}: ChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentUser, token } = useAuth();

  // Buscar mensagens quando o chat abrir
  useEffect(() => {
    if (isOpen && recipientId && token) {
      fetchMessages();
      // Polling para mensagens em tempo real (a cada 3 segundos)
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, recipientId, token]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    if (!token || !recipientId) return;

    setChatLoading(true);
    try {
      const response = await fetch(`/api/messages?recipientId=${recipientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        console.error("Erro ao buscar mensagens:", response.status);
      }
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
    } finally {
      setChatLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || loading || !token || !recipientId) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setLoading(true);

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
      });

      if (response.ok) {
        // Buscar mensagens atualizadas
        await fetchMessages();
      } else {
        // Se falhar, restaurar a mensagem
        setNewMessage(messageContent);
        antMessage.error("Erro ao enviar mensagem");
      }
    } catch (error) {
      // Se falhar, restaurar a mensagem
      setNewMessage(messageContent);
      antMessage.error("Erro ao enviar mensagem");
      console.error("Erro ao enviar mensagem:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Hoje";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Ontem";
    } else {
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
    }
  };

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar 
            src={recipientAvatar} 
            icon={<UserOutlined />}
            size={40}
          />
          <div>
            <Title level={5} style={{ margin: 0, color: '#fff' }}>
              {recipientName}
            </Title>
            <Badge 
              status="success" 
              text={<Text style={{ color: '#b8c5d1', fontSize: '12px' }}>Online</Text>} 
            />
          </div>
        </div>
      }
      placement="right"
      onClose={onClose}
      open={isOpen}
      width={400}
      closeIcon={<CloseOutlined style={{ color: '#fff' }} />}
      headerStyle={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#fff'
      }}
      bodyStyle={{
        background: '#0f0f1a',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)'
      }}
    >
      {/* Área de Mensagens */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)'
      }}>
        {chatLoading && messages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            gap: '16px'
          }}>
            <Spin size="large" />
            <Text style={{ color: '#8892b0' }}>Carregando mensagens...</Text>
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            gap: '8px'
          }}>
            <MessageOutlined style={{ fontSize: '48px', color: '#64748b' }} />
            <Text style={{ color: '#8892b0', textAlign: 'center' }}>
              Nenhuma mensagem ainda.
            </Text>
            <Text style={{ color: '#64748b', fontSize: '14px' }}>
              Comece a conversa! 👋
            </Text>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((message, index) => {
              const isMyMessage = message.sender_id === currentUser?.id;
              const showDate = index === 0 || 
                formatDate(messages[index - 1].created_at) !== formatDate(message.created_at);

              return (
                <div key={message.id}>
                  {showDate && (
                    <div style={{ textAlign: 'center', margin: '16px 0 8px' }}>
                      <Text style={{ 
                        color: '#64748b', 
                        fontSize: '12px',
                        padding: '4px 8px',
                        background: 'rgba(100, 116, 139, 0.1)',
                        borderRadius: '12px'
                      }}>
                        {formatDate(message.created_at)}
                      </Text>
                    </div>
                  )}
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      maxWidth: '80%',
                      padding: '12px 16px',
                      borderRadius: isMyMessage ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isMyMessage 
                        ? 'linear-gradient(135deg, #00d4ff, #0099cc)' 
                        : 'rgba(255, 255, 255, 0.1)',
                      color: isMyMessage ? '#fff' : '#e2e8f0',
                      backdropFilter: 'blur(10px)',
                      border: isMyMessage ? 'none' : '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <Text style={{ 
                        color: isMyMessage ? '#fff' : '#e2e8f0',
                        fontSize: '14px',
                        lineHeight: '1.4'
                      }}>
                        {message.content}
                      </Text>
                      <div style={{
                        fontSize: '11px',
                        color: isMyMessage ? 'rgba(255, 255, 255, 0.8)' : '#94a3b8',
                        marginTop: '4px',
                        textAlign: 'right'
                      }}>
                        {formatTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input de Mensagem - Fixo na parte inferior */}
      <div style={{
        padding: '16px',
        background: 'rgba(26, 26, 46, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <Space.Compact style={{ width: '100%', display: 'flex' }}>
          <TextArea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            disabled={loading}
            maxLength={500}
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              resize: 'none'
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={sendMessage}
            loading={loading}
            disabled={!newMessage.trim() || loading}
            style={{
              background: newMessage.trim() 
                ? 'linear-gradient(135deg, #00d4ff, #0099cc)' 
                : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
        </Space.Compact>
        
        {/* Contador de caracteres */}
        <div style={{
          textAlign: 'right',
          marginTop: '4px',
          fontSize: '11px',
          color: '#64748b'
        }}>
          {newMessage.length}/500
        </div>
      </div>
    </Drawer>
  );
}
