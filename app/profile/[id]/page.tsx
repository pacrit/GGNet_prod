"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth, AuthProvider } from "../../contexts/AuthContext";

function ProfileByIdPage() {
  const { token } = useAuth();
  const { id } = useParams();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function fetchUser() {
      const res = await fetch(`/api/users/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setUser(data.user);
    }
    fetchUser();
  }, [id]);

  if (!user) return <p>Carregando...</p>;

  return (
    <div>
      <button
        className="profile-back-btn"
        onClick={() => window.history.back()}
      >
        <span className="btn-icon-back">←</span> Voltar
      </button>
      <div className="profile-container">
        <div className="profile-header">
          <img
            src={user.avatarUrl || "/placeholder.svg"}
            alt={user.displayName}
            className="profile-avatar"
          />
          <h2 style={{ marginBottom: 0 }}>{user.displayName}</h2>
          <span style={{ color: "#888", fontSize: "1rem" }}>Perfil</span>
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
