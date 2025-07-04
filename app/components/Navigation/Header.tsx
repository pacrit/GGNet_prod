"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { BarsOutlined } from "@ant-design/icons";
import { Button, Drawer } from "antd";
import Sidebar from "../Sidebar/Sidebar";

interface HeaderProps {
  onNavigate: (page: "feed" | "friends") => void;
  currentPage: "feed" | "friends";
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

  const router = useRouter();

  useEffect(() => {
    // Buscar notificações do usuário logado
    async function fetchNotifications() {
      const res = await fetch("/api/notification", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setNotifications(data.notifications || []);
    }
    if (currentUser) fetchNotifications();
  }, [currentUser]);

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
        // Remover a notificação da lista local imediatamente
        setNotifications((prev) =>
          prev.filter((item) => item.id !== notificationId)
        );
      }
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Apenas redirecionar para notificações de like e comment
    if (notification.type === "like" || notification.type === "comment") {
      // Marcar como lida ANTES de redirecionar
      markAsRead(notification.id);

      // Fechar dropdown
      setShowNotifications(false);

      // Redirecionar para o link da notificação (com delay para garantir que a API foi chamada)
      setTimeout(() => {
        if (notification.link) {
          window.location.href = notification.link;
        }
      }, 100);
    }
  };

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
              <div className="notification-menu">
                <button
                  className="notification-btn"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <span className="icon-bell">🔔</span>
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                  )}
                </button>
                {showNotifications && (
                  <div className="notification-dropdown">
                    <h4>Notificações</h4>
                    {notifications.length === 0 && <p>Nenhuma notificação.</p>}
                    <ul>
                      {notifications.map((n) => (
                        <li
                          key={n.id}
                          className={n.is_read ? "read" : "unread"}
                          onClick={() => {
                            // Apenas aplicar onClick para notificações clicáveis
                            if (n.type === "like" || n.type === "comment") {
                              handleNotificationClick(n);
                            }
                          }}
                          style={{
                            cursor:
                              n.type === "like" || n.type === "comment"
                                ? "pointer"
                                : "default",
                          }}
                        >
                          <div className="notification-content">
                            {/* Exibir informações do remetente para friend_request */}
                            {n.type === "friend_request" &&
                              n.from_user_name && (
                                <div className="notification-sender">
                                  <img
                                    src={
                                      n.from_user_avatar ||
                                      "/placeholder-user.jpg"
                                    }
                                    alt={n.from_user_name}
                                    className="notification-sender-avatar"
                                  />
                                  <div className="notification-sender-info">
                                    <strong>{n.from_user_name}</strong>
                                    <span>enviou um pedido de amizade</span>
                                  </div>
                                </div>
                              )}

                            {/* Para outros tipos de notificação, mostrar mensagem normal */}
                            {n.type !== "friend_request" && (
                              <span className="notification-message">
                                {n.message}
                              </span>
                            )}

                            <span className="notification-time">
                              {new Date(n.created_at).toLocaleString("pt-BR")}
                            </span>
                          </div>

                          {/* Ícones visuais */}
                          {n.type === "like" && (
                            <span className="notification-icon">❤️</span>
                          )}
                          {n.type === "comment" && (
                            <span className="notification-icon">💬</span>
                          )}
                          {n.type === "friend_request" && (
                            <span className="notification-icon">👥</span>
                          )}

                          {/* Lógica específica para friend_request */}
                          {n.type === "friend_request" ? (
                            <div className="notification-actions">
                              <Button
                                className="accept-friend-request-button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await fetch("/api/friends/accept", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({
                                      fromUserId: n.from_user_id,
                                    }),
                                  });
                                  await fetch("/api/notification", {
                                    method: "PATCH",
                                    headers: {
                                      "Content-Type": "application/json",
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({ id: n.id }),
                                  });
                                  setNotifications((prev) =>
                                    prev.filter((item) => item.id !== n.id)
                                  );
                                }}
                              >
                                Aceitar
                              </Button>
                              <Button
                                color="danger"
                                variant="outlined"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await fetch("/api/friends/reject", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({
                                      fromUserId: n.from_user_id,
                                    }),
                                  });
                                  await fetch("/api/notification", {
                                    method: "PATCH",
                                    headers: {
                                      "Content-Type": "application/json",
                                      Authorization: `Bearer ${token}`,
                                    },
                                    body: JSON.stringify({ id: n.id }),
                                  });
                                  setNotifications((prev) =>
                                    prev.filter((item) => item.id !== n.id)
                                  );
                                }}
                              >
                                Recusar
                              </Button>
                            </div>
                          ) : (
                            // Para notificações de like e comment, mostrar apenas um indicador visual
                            (n.type === "like" || n.type === "comment") && (
                              <span className="notification-action-hint">
                                Clique para ver
                              </span>
                            )
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="user-menu">
                <button
                  onClick={() => {
                    setShowUserMenu(!showUserMenu), console.log(currentUser);
                  }}
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
      <div className="drawer-mobile">
        <Drawer
          title="Fechar Menu"
          style={{ width: "250px" }}
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
            {/*
              <div
            className="valorant-icon"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setDrawerOpen(false);
              router.push("/valorant");
            }}
          >
            <img src="/icon-cs.png" alt="CS Icon" width={32} height={32} />
            <span className="val-tittle">CS:GO</span>
          </div>
            */}

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
      {/* Sidebar fixa para desktop */}
      <div className="sidebar-desktop">
        <Sidebar />
      </div>
    </div>
  );
}
