"use client";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { useState, useEffect } from "react";
import PostCard from "../components/Feed/PostCard";
import EditProfileModal from "./EditiProfileModal";
import DeleteAccountModal from "./DeleteAccountModal";

interface Post {
  id: number;
  content: string;
  user_id: number;
  created_at: string;
  user_name: string;
  user_avatar?: string;
  likes_count: number;
  user_liked: boolean;
  comments?: any[];
}

function ProfilePage() {
  const { currentUser, token } = useAuth();
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const fetchUserPosts = async () => {
    try {
      const response = await fetch("/api/posts/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao carregar posts do usuário");
      }

      const data = await response.json();
      setUserPosts(data.posts || []);
    } catch (error) {
      console.error("Erro ao buscar posts do usuário:", error);
      setError("Erro ao carregar seus posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && token) {
      fetchUserPosts();
    }
  }, [currentUser, token]);

  const handleLikeToggle = async (postId: number) => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao curtir post");
      }

      const data = await response.json();

      setUserPosts(
        userPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                likes_count: data.likes_count,
                user_liked: data.user_liked,
              }
            : post
        )
      );
    } catch (error) {
      console.error("Erro ao curtir post:", error);
    }
  };

  const handleCommentAdded = async (postId: number, newComment: any) => {
    try {
      const response = await fetch(`/api/posts/${postId}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment.content }),
      });

      if (!response.ok) {
        throw new Error("Erro ao adicionar comentário");
      }

      const data = await response.json();

      setUserPosts((posts) =>
        posts.map((post) =>
          post.id === postId
            ? { ...post, comments: [...(post.comments || []), data.comment] }
            : post
        )
      );
    } catch (error) {
      console.error("Erro ao adicionar comentário:", error);
    }
  };

  const handleProfileUpdated = () => {
    // Recarregar posts se o nome mudou
    fetchUserPosts();
  };

  if (!currentUser) return <p>Carregando...</p>;

  return (
    <div>
      <div className="profile-container">
        <button
          className="profile-back-btn"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          <span className="btn-icon-back">←</span>
          Voltar
        </button>
        
        <div className="profile-actions">
          <button 
            className="profile-edit-btn"
            onClick={() => setEditModalOpen(true)}
          >
            Editar Perfil
          </button>
          <button 
            className="profile-delete-btn"
            onClick={() => setDeleteModalOpen(true)}
          >
            Excluir Conta
          </button>
        </div>
        <div className="profile-header">
          <img
            src={currentUser.avatarUrl || "/placeholder.svg"}
            alt={currentUser.displayName}
            className="profile-avatar"
          />
          <h2 style={{ marginBottom: 0 }}>{currentUser.displayName}</h2>
          <span style={{ color: "#888", fontSize: "1rem" }}>Meu Perfil</span>
        </div>
        <div className="profile-info">
          <div className="profile-info-row">
            <span className="profile-label">Nome</span>
            <span className="profile-value">{currentUser.displayName}</span>
          </div>
          <div className="profile-info-row">
            <span className="profile-label">Email</span>
            <span className="profile-value">{currentUser.email}</span>
          </div>
          <div className="profile-info-row">
            <span className="profile-label">Posts</span>
            <span className="profile-value">{userPosts.length}</span>
          </div>
        </div>

        {/* Seção dos Posts do Usuário */}
        <div className="profile-posts-section">
          <h3>Meus Posts ({userPosts.length})</h3>
          
          {loading && (
            <div className="profile-posts-loading">
              <div className="loading-spinner"></div>
              <p>Carregando seus posts...</p>
            </div>
          )}

          {error && (
            <div className="profile-posts-error">
              <p>{error}</p>
              <button onClick={fetchUserPosts} className="retry-btn">
                Tentar novamente
              </button>
            </div>
          )}

          {!loading && !error && userPosts.length === 0 && (
            <div className="no-posts">
              <h4>Você ainda não fez nenhum post</h4>
              <p>Que tal compartilhar algo na sua timeline?</p>
              <button 
                onClick={() => window.location.href = "/"}
                className="go-to-feed-btn"
              >
                Ir para o Feed
              </button>
            </div>
          )}

          {!loading && !error && userPosts.length > 0 && (
            <div className="profile-posts-list">
              {userPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLikeToggle={handleLikeToggle}
                  onCommentAdded={handleCommentAdded}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <EditProfileModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onProfileUpdated={handleProfileUpdated}
      />

      <DeleteAccountModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}

export default function ProfilePageWrapper() {
  return (
    <AuthProvider>
      <ProfilePage />
    </AuthProvider>
  );
}