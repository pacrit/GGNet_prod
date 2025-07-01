"use client"

interface UserData {
  id: number
  email: string
  displayName: string
  avatar_url?: string
  createdAt: string
}

interface UserCardProps {
  user: UserData
  onOpenChat: (recipientId: number, recipientName: string) => void
}

export default function UserCard({ user, onOpenChat }: UserCardProps) {
  const handleStartChat = () => {
    onOpenChat(user.id, user.displayName)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  return (
    <div className="user-card">
      <div className="user-avatar">
        {user.avatar_url ? (
          <img src={user.avatar_url || "/placeholder.svg"} alt={user.displayName} />
        ) : (
          <div className="avatar-placeholder">{user.displayName.charAt(0).toUpperCase()}</div>
        )}
      </div>

      <div className="user-info">
        <h3>{user.displayName}</h3>
        <p className="user-joined">Membro desde {formatDate(user.createdAt)}</p>
      </div>

      <div className="user-actions">
        <button onClick={handleStartChat} className="chat-button">
          💬 Conversar
        </button>
      </div>
    </div>
  )
}
