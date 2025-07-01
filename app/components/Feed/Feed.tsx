"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import CreatePost from "./CreatePost";
import PostCard from "./PostCard";

interface Post {
  id: number;
  content: string;
  user_id: number;
  created_at: string;
  user_name: string;
  user_avatar?: string;
  likes_count: number;
  user_liked: boolean;
}

interface Comment {
  user_id: number;
  user_name: string;
  user_avatar?: string;
  content: string;
  created_at: string;
}

interface Post {
  id: number;
  content: string;
  user_id: number;
  created_at: string;
  user_name: string;
  user_avatar?: string;
  likes_count: number;
  user_liked: boolean;
  comments?: Comment[]; // <-- novo campo
}

export default function Feed() {
  const { currentUser, token } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPosts = async () => {
    try {
      const response = await fetch("/api/posts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao carregar posts");
      }

      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error("Erro ao buscar posts:", error);
      setError("Erro ao carregar posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && token) {
      fetchPosts();
    }
  }, [currentUser, token]);

  const handlePostCreated = (newPost: Post) => {
    setPosts([newPost, ...posts]);
  };

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

  const handleCommentAdded = async (postId: number, newComment: Comment) => {
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

      // Atualiza o post com o novo comentário retornado do backend
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

  if (loading) {
    return (
      <div className="feed-container">
        <div className="feed-loading">
          <div className="loading-spinner"></div>
          <p>Carregando feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-container">
      <div className="feed-content">
        <CreatePost onPostCreated={handlePostCreated} />

        {error && (
          <div className="feed-error">
            <p>{error}</p>
            <button onClick={fetchPosts} className="retry-btn">
              Tentar novamente
            </button>
          </div>
        )}

        <div className="posts-list">
          {posts.length === 0 ? (
            <div className="no-posts">
              <h3>Nenhum post ainda</h3>
              <p>Seja o primeiro a compartilhar algo!</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLikeToggle={handleLikeToggle}
                onCommentAdded={handleCommentAdded}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
