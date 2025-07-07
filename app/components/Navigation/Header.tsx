"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { 
  BarsOutlined, 
  BellOutlined, 
  DeleteOutlined,
  HeartOutlined,
  MessageOutlined,
  UserAddOutlined,
  ThunderboltOutlined,
  EyeOutlined
} from "@ant-design/icons";
import { 
  Button, 
  Drawer, 
  Dropdown, 
  Badge, 
  List, 
  Avatar, 
  Typography, 
  Space,
  Popconfirm,
  message,
  Empty,
  Spin
} from "antd";
import Sidebar from "../Sidebar/Sidebar";

const { Text, Title } = Typography;

type PageType = "feed" | "squad" | "friends";

interface HeaderProps {
  onNavigate: (page: PageType) => void;
  currentPage: PageType;
}

interface Notification {
  id: number;
  type: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
  from_user_id?: number;
  from_user_name?: string;
  from_user_avatar?: string;
}

export default function Header({ onNavigate, currentPage }: HeaderProps) {
  const { currentUser, logout, token } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [clearingNotifications, setClearingNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  // 📱 Estado para detectar mobile
  const [isMobile, setIsMobile] = useState(false);

  const router = useRouter();

  // 📱 Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Buscar notificações do usuário logado
    async function fetchNotifications() {
      setLoadingNotifications(true);
      try {
        const res = await fetch("/api/notification", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        setNotifications(data.notifications || []);
      } catch (error) {
        console.error("Erro ao buscar notificações:", error);
      } finally {
        setLoadingNotifications(false);
      }
    }
    if (currentUser) fetchNotifications();
  }, [currentUser, token]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch("/api/notification", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: notificationId }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.filter((item) => item.id !== notificationId)
        );
      }
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
      message.error("Erro ao marcar notificação como lida");
    }
  };

  // 🆕 Função para limpar todas as notificações
  const clearAllNotifications = async () => {
    setClearingNotifications(true);
    
    try {
      const response = await fetch("/api/notification", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setNotifications([]);
        message.success("Todas as notificações foram removidas");
      } else {
        message.error("Erro ao limpar notificações");
      }
    } catch (error) {
      console.error("Erro ao limpar notificações:", error);
      message.error("Erro ao limpar notificações");
    } finally {
      setClearingNotifications(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Apenas redirecionar para notificações de like e comment
    if (notification.type === "like" || notification.type === "comment") {
      // Marcar como lida ANTES de redirecionar
      markAsRead(notification.id);

      // Fechar dropdown
      setShowNotifications(false);

      // Redirecionar para o link da notificação
      setTimeout(() => {
        if (notification.link) {
          window.location.href = notification.link;
        }
      }, 100);
    }
  };

  // 🆕 Obter ícone da notificação
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <HeartOutlined style={{ color: '#ff4d4f' }} />;
      case 'comment':
        return <MessageOutlined style={{ color: '#1890ff' }} />;
      case 'friend_request':
        return <UserAddOutlined style={{ color: '#52c41a' }} />;
      case 'game_session_created':
        return <ThunderboltOutlined style={{ color: '#722ed1' }} />;
      default:
        return <BellOutlined style={{ color: '#666' }} />;
    }
  };

  // 🆕 Formatar tempo relativo
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR');
  };

  // 🆕 Dropdown de notificações responsivo
  const notificationDropdown = (
    <div style={{ 
      width: isMobile ? '90vw' : '400px',
      maxWidth: isMobile ? '350px' : '400px',
      maxHeight: isMobile ? '70vh' : '500px',
      background: 'rgba(26, 26, 46, 0.95)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(10px)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ 
        padding: isMobile ? '12px' : '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(255, 255, 255, 0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Title level={5} style={{ 
          margin: 0, 
          color: '#fff',
          fontSize: isMobile ? '14px' : '16px'
        }}>
          Notificações
        </Title>
        {notifications.length > 0 && (
          <Popconfirm
            title="Limpar todas as notificações?"
            description="Esta ação não pode ser desfeita."
            onConfirm={clearAllNotifications}
            okText="Sim, limpar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              loading={clearingNotifications}
              style={{ 
                color: '#ff4d4f',
                fontSize: isMobile ? '12px' : '14px'
              }}
            >
              {isMobile ? 'Limpar' : 'Limpar todas'}
            </Button>
          </Popconfirm>
        )}
      </div>

      {/* Conteúdo */}
      <div style={{ 
        maxHeight: isMobile ? '50vh' : '400px',
        overflow: 'auto',
        background: 'rgba(255, 255, 255, 0.02)'
      }}>
        {loadingNotifications ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Spin size="large" />
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            image={<BellOutlined style={{ fontSize: '48px', color: '#666' }} />}
            description={
              <span style={{ color: '#ccc' }}>Nenhuma notificação</span>
            }
            style={{ padding: '40px' }}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(notification) => (
              <List.Item
                style={{
                  padding: isMobile ? '8px 12px' : '12px 16px',
                  backgroundColor: notification.is_read 
                    ? 'rgba(255, 255, 255, 0.02)' 
                    : 'rgba(0, 212, 255, 0.1)',
                  cursor: (notification.type === "like" || notification.type === "comment") ? 'pointer' : 'default',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease',
                }}
                onClick={() => handleNotificationClick(notification)}
                actions={[
                  <Space key="actions">
                    <Text type="secondary" style={{ fontSize: '12px', color: '#ccc' }}>
                      {formatRelativeTime(notification.created_at)}
                    </Text>
                    {!notification.is_read && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#00d4ff'
                      }} />
                    )}
                  </Space>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{ position: 'relative' }}>
                      <Avatar 
                        src={notification.from_user_avatar || "/placeholder-user.jpg"}
                        size={isMobile ? 32 : 40}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        background: 'rgba(26, 26, 46, 0.9)',
                        borderRadius: '50%',
                        padding: '2px',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }}>
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>
                  }
                  title={
                    <div>
                      {notification.type === "friend_request" && notification.from_user_name ? (
                        <Space direction="vertical" size={0}>
                          <Text strong style={{ color: '#fff', fontSize: isMobile ? '12px' : '14px' }}>
                            {notification.from_user_name}
                          </Text>
                          <Text type="secondary" style={{ fontSize: '11px', color: '#ccc' }}>
                            enviou um pedido de amizade
                          </Text>
                        </Space>
                      ) : (
                        <Text strong style={{ fontSize: isMobile ? '12px' : '14px', color: '#fff' }}>
                          {notification.message}
                        </Text>
                      )}
                    </div>
                  }
                  description={
                    <div>
                      {/* Botões para pedido de amizade */}
                      {notification.type === "friend_request" && (
                        <Space style={{ marginTop: '8px' }} size={isMobile ? 'small' : 'middle'}>
                          <Button
                            type="primary"
                            size="small"
                            style={{
                              background: 'linear-gradient(45deg, #52c41a, #389e0d)',
                              border: 'none',
                              fontSize: isMobile ? '11px' : '12px'
                            }}
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await fetch("/api/friends/accept", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({
                                    fromUserId: notification.from_user_id,
                                  }),
                                });
                                await markAsRead(notification.id);
                                message.success("Pedido de amizade aceito!");
                              } catch (error) {
                                message.error("Erro ao aceitar pedido de amizade");
                              }
                            }}
                          >
                            Aceitar
                          </Button>
                          <Button
                            size="small"
                            style={{
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              color: '#fff',
                              fontSize: isMobile ? '11px' : '12px'
                            }}
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await fetch("/api/friends/reject", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({
                                    fromUserId: notification.from_user_id,
                                  }),
                                });
                                await markAsRead(notification.id);
                                message.info("Pedido de amizade recusado");
                              } catch (error) {
                                message.error("Erro ao recusar pedido de amizade");
                              }
                            }}
                          >
                            Recusar
                          </Button>
                        </Space>
                      )}
                      
                      {/* Hint para outras notificações */}
                      {(notification.type === "like" || notification.type === "comment") && (
                        <div style={{ marginTop: '4px' }}>
                          <Text type="secondary" style={{ fontSize: '10px', color: '#ccc' }}>
                            <EyeOutlined /> Clique para ver
                          </Text>
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <div>
      <header className="app-header">
        <div className="header-container">
          <div className="header-tittle">
            <h1 className="app-logo">GG Networking</h1>
          </div>
          <div className="header-actions">
            <nav className="header-nav">
              <BarsOutlined
                className="menu-icon-left mobile-only"
                onClick={() => setDrawerOpen(true)}
              />
              <button
                onClick={() => onNavigate("feed")}
                className={`nav-btn ${currentPage === "feed" ? "active" : ""}`}
              >
                <span className="nav-icon">🏠</span>
                <span className="nav-text">Feed</span>
              </button>

              <button
                onClick={() => onNavigate("squad")}
                className={`nav-btn ${currentPage === "squad" ? "active" : ""}`}
              >
                <span className="nav-icon">🎮</span>
                <span className="nav-text">Squads</span>
              </button>

              <button
                onClick={() => onNavigate("friends")}
                className={`nav-btn ${
                  currentPage === "friends" ? "active" : ""
                }`}
              >
                <span className="nav-icon">👥</span>
                <span className="nav-text">Amigos</span>
              </button>
            </nav>

            <div className="header-right">
              {/* 🆕 Notificações com CSS class personalizada */}
              <Dropdown
                overlay={notificationDropdown}
                trigger={['click']}
                open={showNotifications}
                onOpenChange={setShowNotifications}
                placement="bottomRight"
                getPopupContainer={() => document.body}
                overlayClassName={isMobile ? 'notification-dropdown-mobile' : ''}
                overlayStyle={isMobile ? {
                  position: 'fixed' as const,
                  top: '60px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  right: 'auto',
                  zIndex: 9999
                } : {}}
              >
                <Button
                  type="text"
                  icon={
                    <Badge count={unreadCount} size="small">
                      <BellOutlined style={{ fontSize: '20px' }} />
                    </Badge>
                  }
                  style={{ 
                    border: 'none',
                    boxShadow: 'none'
                  }}
                />
              </Dropdown>

              {/* Menu do usuário */}
              <div className="user-menu">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="user-menu-btn"
                >
                  <div className="user-avatar-small">
                    {currentUser?.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl || "/placeholder.svg"}
                        alt={currentUser.displayName}
                      />
                    ) : (
                      <div className="avatar-placeholder">
                        {currentUser?.displayName?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="user-name">{currentUser?.displayName}</span>
                  <span className="dropdown-arrow">▼</span>
                </button>

                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="dropdown-header">
                      <div className="user-avatar">
                        {currentUser?.avatarUrl ? (
                          <img
                            src={currentUser.avatarUrl || "/placeholder.svg"}
                            alt={currentUser.displayName}
                          />
                        ) : (
                          <div className="avatar-placeholder">
                            {currentUser?.displayName?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="user-details">
                        <h4>{currentUser?.displayName}</h4>
                        <p>{currentUser?.email}</p>
                      </div>
                    </div>

                    <div className="dropdown-divider"></div>

                    <div className="dropdown-actions">
                      <button
                        className="dropdown-btn"
                        onClick={() => {
                          setShowUserMenu(false);
                          window.location.href = "/profile";
                        }}
                      >
                        <span className="btn-icon">👤</span>
                        Perfil
                      </button>
                    </div>

                    <div className="dropdown-divider"></div>

                    <button
                      onClick={handleLogout}
                      className="dropdown-btn logout-btn"
                    >
                      <span className="btn-icon">🚪</span>
                      Sair
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {showUserMenu && (
          <div
            className="dropdown-overlay"
            onClick={() => setShowUserMenu(false)}
          ></div>
        )}
      </header>

      {/* Mobile drawer */}
      <div className="drawer-mobile">
        <Drawer
          title="Menu"
          placement="left"
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
        >
          <div className="drawer-content">
            <div className="drawer-header">
              <h2>Integrações</h2>
            </div>
            <div
              className="valorant-icon"
              style={{ cursor: "pointer" }}
              onClick={() => {
                setDrawerOpen(false);
                router.push("/valorant");
              }}
            >
              <img
                src="/icon-val.png"
                alt="Valorant Icon"
                width={32}
                height={32}
              />
              <span className="val-tittle">Valorant</span>
            </div>

            <div
              className="valorant-icon"
              style={{ cursor: "pointer" }}
              onClick={() => {
                setDrawerOpen(false);
                router.push("/lol");
              }}
            >
              <img src="/icon-lol.png" alt="LOL icon" width={32} height={32} />
              <span className="val-tittle">LOL</span>
            </div>
          </div>
        </Drawer>
      </div>

      {/* Sidebar desktop */}
      <div className="sidebar-desktop">
        <Sidebar />
      </div>
    </div>
  );
}
