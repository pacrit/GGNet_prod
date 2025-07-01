"use client";

import { useState } from "react";

interface Post {
  id: number;
  content: string;
  image_url?: string;
  user_id: number;
  created_at: string;
  user_name: string;
  user_avatar?: string;
  likes_count: number;
  user_liked: boolean;
  comments?: Comment[];
}

interface Comment {
  id?: number;
  user_id: number;
  user_name: string;
  user_avatar?: string;
  content: string;
  created_at: string;
}

interface PostCardProps {
  post: Post;
  onLikeToggle: (postId: number) => void;
  onCommentAdded: (postId: number, newComment: Comment) => void;
}

export default function PostCard({
  post,
  onLikeToggle,
  onCommentAdded,
}: PostCardProps) {
  const [isLiking, setIsLiking] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState("");

  const handleLike = async () => {
    if (isLiking) return;

    setIsLiking(true);
    await onLikeToggle(post.id);
    setIsLiking(false);
  };

  const handleCommentClick = () => {
    setShowCommentBox((prev) => !prev);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userStr = localStorage.getItem("auth_user");
    if (!userStr) {
      // Trate o caso do usuário não estar logado
      alert("Você precisa estar logado para comentar.");
      return;
    }
    const user = JSON.parse(userStr);

    const newComment = {
      user_id: user.id,
      user_name: user.displayName,
      user_avatar: user.avatarUrl,
      content: comment.trim(),
      created_at: new Date().toISOString(),
    };
    console.log("Usuário logado:", user);
    console.log("Post ID:", post.id);
    console.log("Novo comentário:", newComment);

    await onCommentAdded(post.id, newComment);
    setComment("");
    setShowCommentBox(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Agora";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;

    return date.toLocaleDateString("pt-BR");
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-user-avatar">
          {post.user_avatar ? (
            <img
              src={post.user_avatar || "/placeholder.svg"}
              alt={post.user_name}
            />
          ) : (
            <div className="avatar-placeholder">
              {post.user_name?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="post-user-info">
          <h4 className="post-user-name">{post.user_name}</h4>
          <span className="post-time">{formatDate(post.created_at)}</span>
        </div>
      </div>

      <div className="post-content">
        <p>{post.content}</p>
        {post.image_url && (
          <img
            src={post.image_url}
            alt="Imagem do post"
            className="post-image"
            style={{
              maxWidth: "100%",
              maxHeight: "320px",
              borderRadius: "12px",
              marginTop: "12px",
              objectFit: "cover",
            }}
          />
        )}
      </div>

      <div className="post-stats">
        {post.likes_count > 0 && (
          <span className="likes-count">
            ❤️ {post.likes_count}{" "}
            {post.likes_count === 1 ? "curtida" : "curtidas"}
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
          <span className="action-text">
            {isLiking ? "..." : post.user_liked ? "Curtido" : "Curtir"}
          </span>
        </button>

        <button className="action-btn comment-btn" onClick={handleCommentClick}>
          <span className="action-icon">💬</span>
          <span className="action-text">Comentar</span>
        </button>
      </div>

      {showCommentBox && (
        <form onSubmit={handleCommentSubmit} className="comment-box">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Digite seu comentário..."
            rows={2}
            required
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={!comment.trim()}
          >
            Enviar
          </button>
        </form>
      )}

      {post.comments && post.comments.length > 0 && (
        <div className="post-comments">
          {post.comments.map((comment, idx) => (
            <div key={comment.id || idx} className="comment">
              <div className="comment-avatar">
                {comment.user_avatar ? (
                  <img
                    src={comment.user_avatar}
                    alt={comment.user_name}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      objectFit: "cover",
                      marginRight: 8,
                    }}
                  />
                ) : (
                  <div
                    className="avatar-placeholder"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "#eee",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                      fontWeight: "bold",
                    }}
                  >
                    {comment.user_name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="comment-body">
                <span
                  className="comment-user"
                  style={{ fontWeight: "bold" }}
                >
                  {comment.user_name}
                </span>
                <span
                  className="comment-content"
                  style={{ marginLeft: 8 }}
                >
                  {comment.content}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
