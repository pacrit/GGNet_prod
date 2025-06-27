"use client"

import "./UserCard.css"

export default function UserCard({ user, onOpenChat }) {
  const handleStartChat = () => {
    onOpenChat(user.uid, user.displayName || user.email)
  }

  return (
    <div className="user-card">
      <div className="user-avatar">
        {user.photoURL ? (
          <img src={user.photoURL || "/placeholder.svg"} alt={user.displayName} />
        ) : (
          <div className="avatar-placeholder">{(user.displayName || user.email).charAt(0).toUpperCase()}</div>
        )}
      </div>

      <div className="user-info">
        <h3>{user.displayName || "Usuário"}</h3>
        <p className="user-email">{user.email}</p>
        <p className="user-joined">Membro desde {user.createdAt?.toDate?.()?.toLocaleDateString() || "Recentemente"}</p>
      </div>

      <div className="user-actions">
        <button onClick={handleStartChat} className="chat-button">
          💬 Conversar
        </button>
      </div>
    </div>
  )
}
