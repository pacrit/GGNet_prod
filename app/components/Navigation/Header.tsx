"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "antd";

interface HeaderProps {
  onNavigate: (page: "feed" | "friends") => void;
  currentPage: "feed" | "friends";
}

interface Notification {
  id: number;
  type: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export default function Header({ onNavigate, currentPage }: HeaderProps) {
  const { currentUser, logout, token } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

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

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
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
              onClick={() => onNavigate("friends")}
              className={`nav-btn ${currentPage === "friends" ? "active" : ""}`}
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
                      <li key={n.id} className={n.is_read ? "read" : "unread"}>
                        <span>{n.message}</span>
                        <small>{new Date(n.created_at).toLocaleString()}</small>
                        {n.type === "friend_request" ? (
                          <div style={{ marginTop: 8 }}>
                            <Button
                              className="accept-friend-request-button"
                              onClick={async () => {
                                await fetch("/api/friends/accept", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({
                                    fromUserId: n.link?.split("/").pop(),
                                  }),
                                });
                                // Marcar como lida no backend (opcional)
                                await fetch("/api/notification", {
                                  method: "PATCH",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({ id: n.id }),
                                });
                                // Remover do estado local
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
                              onClick={async () => {
                                await fetch("/api/friends/reject", {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({
                                    fromUserId: n.link?.split("/").pop(),
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
                              style={{ marginLeft: 8 }}
                            >
                              Recusar
                            </Button>
                          </div>
                        ) : (
                          <span
                            onClick={async () => {
                              await fetch("/api/notification", {
                                method: "PATCH",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({ id: n.id }),
                              });
                              setNotifications((prev) =>
                                prev.map((item) =>
                                  item.id === n.id
                                    ? { ...item, is_read: true }
                                    : item
                                )
                              );
                              if (n.link) window.location.href = n.link;
                            }}
                            style={{ cursor: n.link ? "pointer" : "default" }}
                          >
                            {n.link && "Ver"}
                          </span>
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
                    <button className="dropdown-btn">
                      <span className="btn-icon">⚙️</span>
                      Configurações
                    </button>
                    <button className="dropdown-btn">
                      <span className="btn-icon">❓</span>
                      Ajuda
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
  );
}
