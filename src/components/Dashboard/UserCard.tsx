"use client"

interface UserData {
  id: number
  email: string
  display_name: string
  avatar_url?: string
  created_at: string
}

interface UserCardProps {
  user: UserData
  onOpenChat: (recipientId: number, recipientName: string) => void
}

export default function UserCard({ user, onOpenChat }: UserCardProps) {
  const handleStartChat = () => {
    onOpenChat(user.id, user.display_name)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  return (
    <div className="user-card">
      <div className="user-avatar">
        {user.avatar_url ? (
          <img src={user.avatar_url || "/placeholder.svg"} alt={user.display_name} />
        ) : (
          <div className="avatar-placeholder">{user.display_name.charAt(0).toUpperCase()}</div>
        )}
      </div>

      <div className="user-info">
        <h3>{user.display_name}</h3>
        <p className="user-email">{user.email}</p>
        <p className="user-joined">Membro desde {formatDate(user.created_at)}</p>
      </div>

      <div className="user-actions">
        <button onClick={handleStartChat} className="chat-button">
          💬 Conversar
        </button>
      </div>
    </div>
  )
}
