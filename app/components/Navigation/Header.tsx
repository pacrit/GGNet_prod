"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import {
  WechatWorkOutlined,
  BellOutlined,
  DeleteOutlined,
  HeartOutlined,
  MessageOutlined,
  UserAddOutlined,
  ThunderboltOutlined,
  EyeOutlined,
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
  Spin,
  Tooltip,
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
  const [isMobile, setIsMobile] = useState(false);
  const [lastCheck, setLastCheck] = useState<string>(new Date().toISOString());

  // Estados para Push Notifications
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  const router = useRouter();

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Função para buscar notificações
  const fetchNotifications = useCallback(async (showNewNotification = false) => {
    if (!token) return;

    try {
      setLoadingNotifications(true);
      const response = await fetch('/api/notification', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const newNotifications = data.notifications || [];

        // Verificar se há notificações novas
        if (showNewNotification && notifications.length > 0) {
          const currentIds = new Set(notifications.map(n => n.id));
          const freshNotifications = newNotifications.filter((n: Notification) => 
            !currentIds.has(n.id) && new Date(n.created_at) > new Date(lastCheck)
          );

          // Mostrar notificação do sistema para novas notificações
          if (freshNotifications.length > 0) {
            freshNotifications.forEach((notification: Notification) => {
              showSystemNotification(notification);
              playNotificationSound();
            });
          }
        }

        setNotifications(newNotifications);
        setLastCheck(new Date().toISOString());
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [token, notifications.length, lastCheck]);

  // 🔧 Som de notificação CORRIGIDO
  const playNotificationSound = () => {
    try {
      // Usando um beep simples do sistema
      if ('AudioContext' in window || 'webkitAudioContext' in window) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
      }
    } catch (error) {
      // Ignorar erro de som
      console.log('Som não disponível');
    }
  };

  // 🔧 Notificação do sistema CORRIGIDA
  const showSystemNotification = (notification: Notification) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const systemNotification = new Notification('GGNetworking', {
      body: notification.message,
      icon: '/favicon.ico',
      tag: `notification-${notification.id}`,
    });

    systemNotification.onclick = () => {
      window.focus();
      if (notification.link) {
        window.location.href = notification.link;
      }
      systemNotification.close();
    };

    // Auto fechar após 5 segundos
    setTimeout(() => systemNotification.close(), 5000);
  }
};

  // Solicitar permissão para notificações
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        message.success('Notificações ativadas!');
      }
    }
  }, []);

  // 🆕 Função para ativar Push Notifications
  const enablePushNotifications = async () => {
    if (!pushSupported) {
      message.error('Push notifications não são suportadas neste dispositivo');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        message.warning('Permissão para notificações negada');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Usar uma chave temporária para teste
      const vapidKey = 'BMqSvZy8Q3Mm5rnXCNk7G-pGBnjfLCJjcq7rBqtXt5eBOr3oGnDUQrfKH7MtBkqT9WFOH2BKZj5Y2-Q3z8b9qG8';
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Por enquanto, apenas mostrar sucesso (sem API)
      setPushSubscribed(true);
      message.success('Push notifications ativadas! (modo de teste)');
      
    } catch (error) {
      console.error('Erro ao ativar push notifications:', error);
      message.error('Erro ao ativar push notifications');
    }
  };

  // 🆕 Função utilitária para VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // useEffect para polling em tempo real
  useEffect(() => {
    if (!currentUser || !token) return;

    // Buscar inicial
    fetchNotifications(false);

    // Solicitar permissão de notificação (após 3 segundos)
    const permissionTimer = setTimeout(() => {
      requestNotificationPermission();
    }, 3000);

    // Polling a cada 10 segundos quando ativo
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchNotifications(true);
      }
    }, 10000);

    // Buscar quando voltar para a aba
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchNotifications(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Verificar suporte a Push Notifications
    const checkPushSupport = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setPushSupported(true);
          setPushSubscribed(!!subscription);
        } catch (error) {
          console.error('Erro ao verificar push notifications:', error);
        }
      }
    };

    checkPushSupport();

    return () => {
      clearTimeout(permissionTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, token, fetchNotifications, requestNotificationPermission]);

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
    if (notification.type === "like" || notification.type === "comment") {
      markAsRead(notification.id);
      setShowNotifications(false);

      setTimeout(() => {
        if (notification.link) {
          window.location.href = notification.link;
        }
      }, 100);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <HeartOutlined style={{ color: "#ff4d4f" }} />;
      case "comment":
        return <MessageOutlined style={{ color: "#1890ff" }} />;
      case "friend_request":
        return <UserAddOutlined style={{ color: "#52c41a" }} />;
      case "game_session_created":
        return <ThunderboltOutlined style={{ color: "#722ed1" }} />;
      default:
        return <BellOutlined style={{ color: "#666" }} />;
    }
  };

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
    return date.toLocaleDateString("pt-BR");
  };

  const notificationButton = (
    <Tooltip title="Notificações em tempo real ativadas">
      <Button
        type="text"
        icon={
          <Badge count={unreadCount} size="small">
            <BellOutlined 
              style={{ 
                fontSize: "20px",
                color: unreadCount > 0 ? "#00d4ff" : "inherit" 
              }} 
            />
          </Badge>
        }
        style={{
          border: "none",
          boxShadow: "none",
          position: "relative",
        }}
      >
        {!loadingNotifications && (
          <div
            style={{
              position: "absolute",
              top: "2px",
              right: "2px",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#52c41a",
              animation: "pulse 2s infinite",
            }}
          />
        )}
      </Button>
    </Tooltip>
  );

  const notificationDropdown = (
    <div
      style={{
        width: isMobile ? "90vw" : "400px",
        maxWidth: isMobile ? "350px" : "400px",
        maxHeight: isMobile ? "70vh" : "500px",
        background: "rgba(26, 26, 46, 0.95)",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(10px)",
        overflow: "hidden",
      }}
    >
      {/* Header com Push Notifications */}
      <div
        style={{
          padding: isMobile ? "12px" : "16px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          background: "rgba(255, 255, 255, 0.05)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <Title
            level={5}
            style={{
              margin: 0,
              color: "#fff",
              fontSize: isMobile ? "14px" : "16px",
            }}
          >
            Notificações
            <span style={{ 
              color: "#52c41a", 
              fontSize: "10px", 
              marginLeft: "8px" 
            }}>
              ● LIVE
            </span>
          </Title>
          
          {notifications.length > 0 && (
            <Popconfirm
              title="Limpar todas as notificações?"
              description="Esta ação não pode ser desfeita."
              onConfirm={clearAllNotifications}
              okText="Sim"
              cancelText="Não"
              okButtonProps={{ 
                loading: clearingNotifications,
                style: { background: '#ff4d4f', borderColor: '#ff4d4f' }
              }}
            >
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                loading={clearingNotifications}
                style={{ color: "#ff4d4f" }}
              >
                Limpar
              </Button>
            </Popconfirm>
          )}
        </div>

        {/* 🆕 Push Notifications Toggle */}
        {pushSupported && (
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            padding: "8px 0",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            marginTop: "8px",
          }}>
            <Space>
              <BellOutlined style={{ color: pushSubscribed ? '#52c41a' : '#666' }} />
              <Text style={{ color: '#fff', fontSize: '12px' }}>
                Push Notifications
              </Text>
              {pushSubscribed && (
                <Text type="success" style={{ fontSize: '10px' }}>Ativas</Text>
              )}
            </Space>
            
            {!pushSubscribed ? (
              <Button 
                type="primary"
                size="small"
                onClick={enablePushNotifications}
                style={{ 
                  background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
                  border: 'none',
                  fontSize: '10px',
                }}
              >
                Ativar
              </Button>
            ) : (
              <Text style={{ color: '#52c41a', fontSize: '10px' }}>✓ Ativo</Text>
            )}
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div
        style={{
          maxHeight: isMobile ? "50vh" : "400px",
          overflow: "auto",
          background: "rgba(255, 255, 255, 0.02)",
        }}
      >
        {loadingNotifications ? (
          <div style={{ padding: "40px", textAlign: "center" }}>
            <Spin size="large" />
          </div>
        ) : notifications.length === 0 ? (
          <Empty
            image={<BellOutlined style={{ fontSize: "48px", color: "#666" }} />}
            description={
              <span style={{ color: "#ccc" }}>Nenhuma notificação</span>
            }
            style={{ padding: "40px" }}
          />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(notification) => (
              <List.Item
                style={{
                  padding: isMobile ? "8px 12px" : "12px 16px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                onClick={() => handleNotificationClick(notification)}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {getNotificationIcon(notification.type)}
                      {notification.from_user_avatar ? (
                        <Avatar
                          src={notification.from_user_avatar}
                          size={isMobile ? 32 : 40}
                        />
                      ) : (
                        <Avatar
                          icon={<UserAddOutlined />}
                          size={isMobile ? 32 : 40}
                          style={{ backgroundColor: "#00d4ff" }}
                        />
                      )}
                    </div>
                  }
                  title={
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: isMobile ? "12px" : "14px",
                          lineHeight: "1.4",
                          flex: 1,
                          marginRight: "8px",
                        }}
                      >
                        {notification.message}
                      </Text>
                      <Text
                        style={{
                          color: "#8892b0",
                          fontSize: "10px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatRelativeTime(notification.created_at)}
                      </Text>
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
              {/* 🔄 USAR o novo botão de notificação */}
              <Dropdown
                overlay={notificationDropdown}
                trigger={["click"]}
                open={showNotifications}
                onOpenChange={setShowNotifications}
                placement="bottomRight"
                getPopupContainer={() => document.body}
                overlayClassName={
                  isMobile ? "notification-dropdown-mobile" : ""
                }
                overlayStyle={
                  isMobile
                    ? {
                        position: "fixed" as const,
                        top: "60px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        right: "auto",
                        zIndex: 9999,
                      }
                    : {}
                }
              >
                {notificationButton} {/* 🔄 USAR nova variável */}
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
                      <Button
                      style={{ width: "100%", marginBottom: "8px" }}
                      icon={<ThunderboltOutlined />}
                        color="purple"
                        onClick={() => {
                          setDrawerOpen(true);
                        }}
                        variant="outlined"
                      >
                        Jogos
                      </Button>
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

      {/* 🆕 CSS para animação do indicador */}
      <style jsx>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.7);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(82, 196, 26, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(82, 196, 26, 0);
          }
        }
      `}</style>
    </div>
  );
}
