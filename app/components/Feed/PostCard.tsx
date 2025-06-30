"use client"

import { useState } from "react"

interface Post {
  id: number
  content: string
  user_id: number
  created_at: string
  user_name: string
  user_avatar?: string
  likes_count: number
  user_liked: boolean
}

interface PostCardProps {
  post: Post
  onLikeToggle: (postId: number) => void
}

export default function PostCard({ post, onLikeToggle }: PostCardProps) {
  const [isLiking, setIsLiking] = useState(false)

  const handleLike = async () => {
    if (isLiking) return

    setIsLiking(true)
    await onLikeToggle(post.id)
    setIsLiking(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Agora"
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`

    return date.toLocaleDateString("pt-BR")
  }

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-user-avatar">
          {post.user_avatar ? (
            <img src={post.user_avatar || "/placeholder.svg"} alt={post.user_name} />
          ) : (
            <div className="avatar-placeholder">{post.user_name?.charAt(0).toUpperCase()}</div>
          )}
        </div>
        <div className="post-user-info">
          <h4 className="post-user-name">{post.user_name}</h4>
          <span className="post-time">{formatDate(post.created_at)}</span>
        </div>
      </div>

      <div className="post-content">
        <p>{post.content}</p>
      </div>

      <div className="post-stats">
        {post.likes_count > 0 && (
          <span className="likes-count">
            ❤️ {post.likes_count} {post.likes_count === 1 ? "curtida" : "curtidas"}
          </span>
        )}
      </div>

      <div className="post-actions">
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={`action-btn like-btn ${post.user_liked ? "liked" : ""}`}
        >
          <span className="action-icon">{post.user_liked ? "❤️" : "🤍"}</span>
          <span className="action-text">{isLiking ? "..." : post.user_liked ? "Curtido" : "Curtir"}</span>
        </button>

        <button className="action-btn comment-btn">
          <span className="action-icon">💬</span>
          <span className="action-text">Comentar</span>
        </button>

        <button className="action-btn share-btn">
          <span className="action-icon">📤</span>
          <span className="action-text">Compartilhar</span>
        </button>
      </div>
    </div>
  )
}
