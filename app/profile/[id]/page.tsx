"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth, AuthProvider } from "../../contexts/AuthContext";
import PostCard from "../../components/Feed/PostCard";

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

function ProfileByIdPage() {
  const { token, currentUser } = useAuth();
  const { id } = useParams();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState("");
  const [areFriends, setAreFriends] = useState(false);
  const [isSelfProfile, setIsSelfProfile] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`/api/users/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        setUser(data.user);
      } catch (error) {
        console.error("Erro ao buscar usuário:", error);
      } finally {
        setLoading(false);
      }
    }
    
    if (token && id) {
      fetchUser();
    }
  }, [id, token]);

  useEffect(() => {
    async function fetchUserPosts() {
      try {
        setPostsLoading(true);
        const res = await fetch(`/api/users/${id}/posts`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        
        if (data.success) {
          setPosts(data.posts || []);
          setAreFriends(data.areFriends || false);
          setIsSelfProfile(data.isSelfProfile || false);
        } else {
          setPostsError(data.message || "Erro ao carregar posts");
        }
      } catch (error) {
        console.error("Erro ao buscar posts:", error);
        setPostsError("Erro ao carregar posts");
      } finally {
        setPostsLoading(false);
      }
    }
    
    if (token && id) {
      fetchUserPosts();
    }
  }, [id, token]);

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

      setPosts(
        posts.map((post) =>
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

      setPosts((posts) =>
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

  if (loading) return <p>Carregando...</p>;
  if (!user) return <p>Usuário não encontrado</p>;

  return (
    <div>
      <div className="profile-container">
        <button
          className="profile-back-btn"
          onClick={() => window.history.back()}
        >
          <span className="btn-icon-back">←</span> Voltar
        </button>
        
        <div className="profile-header">
          <img
            src={user.avatarUrl || "/placeholder.svg"}
            alt={user.displayName}
            className="profile-avatar"
          />
          <h2 style={{ marginBottom: 0 }}>{user.displayName}</h2>
          <span style={{ color: "#888", fontSize: "1rem" }}>
            {isSelfProfile ? "Seu Perfil" : areFriends ? "Amigo" : "Perfil"}
          </span>
        </div>
        
        <div className="profile-info">
          <div className="profile-info-row">
            <span className="profile-label">Nome</span>
            <span className="profile-value">{user.displayName}</span>
          </div>
          <div className="profile-info-row">
            <span className="profile-label">Email</span>
            <span className="profile-value">{user.email}</span>
          </div>
          <div className="profile-info-row">
            <span className="profile-label">Posts</span>
            <span className="profile-value">{posts.length}</span>
          </div>
        </div>

        {/* Seção dos Posts */}
        <div className="profile-posts-section">
          <h3>
            {isSelfProfile ? "Seus Posts" : `Posts de ${user.displayName}`} ({posts.length})
          </h3>
          
          {postsLoading && (
            <div className="profile-posts-loading">
              <div className="loading-spinner"></div>
              <p>Carregando posts...</p>
            </div>
          )}

          {postsError && (
            <div className="profile-posts-error">
              <p>{postsError}</p>
            </div>
          )}

          {!postsLoading && !postsError && posts.length === 0 && (
            <div className="no-posts">
              {isSelfProfile ? (
                <>
                  <h4>Você ainda não fez nenhum post</h4>
                  <p>Que tal compartilhar algo na sua timeline?</p>
                  <button 
                    onClick={() => window.location.href = "/"}
                    className="go-to-feed-btn"
                  >
                    Ir para o Feed
                  </button>
                </>
              ) : areFriends ? (
                <>
                  <h4>{user.displayName} ainda não fez nenhum post</h4>
                  <p>Quando ele postar algo, aparecerá aqui.</p>
                </>
              ) : (
                <>
                  <h4>Posts privados</h4>
                  <p>Você precisa ser amigo de {user.displayName} para ver os posts dele.</p>
                  <button 
                    onClick={() => window.location.href = "/friends"}
                    className="go-to-feed-btn"
                  >
                    Enviar Convite
                  </button>
                </>
              )}
            </div>
          )}

          {!postsLoading && !postsError && posts.length > 0 && (
            <div className="profile-posts-list">
              {posts.map((post) => (
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
    </div>
  );
}

export default function PageId() {
  return (
    <AuthProvider>
      <ProfileByIdPage />
    </AuthProvider>
  );
}