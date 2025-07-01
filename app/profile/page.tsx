"use client";
import { AuthProvider, useAuth } from "../contexts/AuthContext";

function ProfilePage() {
  const { currentUser } = useAuth();

  if (!currentUser) return <p>Carregando...</p>;

  return (
    <div>
      <button
        className="profile-back-btn"
        onClick={() => {
          window.location.href = "/";
        }}
      >
        <span className="btn-icon-back">←</span>
        Voltar
      </button>
      <div className="profile-container">
        <div className="profile-actions">
          <button className="profile-edit-btn">Editar Perfil</button>
          <button className="profile-delete-btn">Excluir Conta</button>
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
          {/* Adicione mais campos se quiser */}
        </div>
      </div>
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
