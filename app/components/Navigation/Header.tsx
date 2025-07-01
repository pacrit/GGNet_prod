"use client";

import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

interface HeaderProps {
  onNavigate: (page: "feed" | "friends") => void;
  currentPage: "feed" | "friends";
}

export default function Header({ onNavigate, currentPage }: HeaderProps) {
  const { currentUser, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-left">
          <h1 className="app-logo">GG Networking</h1>
        </div>

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
                  <button className="dropdown-btn">
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

      {showUserMenu && (
        <div
          className="dropdown-overlay"
          onClick={() => setShowUserMenu(false)}
        ></div>
      )}
    </header>
  );
}
