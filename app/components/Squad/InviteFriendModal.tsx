"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";

interface InviteFriendModalProps {
  onClose: () => void;
  squadId: number;
  squadName: string;
}

interface Friend {
  id: number;
  displayName: string;
  email: string;
  avatarUrl?: string;
}

export default function InviteFriendModal({ onClose, squadId, squadName }: InviteFriendModalProps) {
  const { token } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      const response = await fetch("/api/friends", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setFriends(data.users);
      } else {
        setError("Erro ao carregar amigos");
      }
    } catch (error) {
      console.error("Erro ao buscar amigos:", error);
      setError("Erro ao carregar amigos");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteFriend = async (friendId: number, friendName: string) => {
    setInviting(friendId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/squads/${squadId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          invitedUserId: friendId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Convite enviado para ${friendName}!`);
        // Remover o amigo da lista para evitar convites duplicados
        setFriends(prev => prev.filter(friend => friend.id !== friendId));
      } else {
        setError(data.error || "Erro ao enviar convite");
      }
    } catch (error) {
      console.error("Erro ao convidar amigo:", error);
      setError("Erro ao enviar convite");
    } finally {
      setInviting(null);
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="squad-modal-overlay">
      <div className="squad-modal-content">
        <div className="squad-modal-header">
          <h2>👥 Convidar Amigo para "{squadName}"</h2>
          <button className="squad-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="invite-friend-content">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              {success}
            </div>
          )}

          <div className="squad-form-group">
            <label htmlFor="search">Buscar Amigo</label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o nome do amigo..."
              disabled={loading}
            />
          </div>

          {loading ? (
            <div className="squad-loading-center">
              <div className="loading-spinner"></div>
              <p>Carregando amigos...</p>
            </div>
          ) : (
            <div className="friends-list">
              {filteredFriends.length === 0 ? (
                <div className="no-friends">
                  {searchTerm ? (
                    <p>Nenhum amigo encontrado com "{searchTerm}"</p>
                  ) : (
                    <p>Você não tem amigos para convidar ou todos já foram convidados.</p>
                  )}
                </div>
              ) : (
                <div className="friends-grid">
                  {filteredFriends.map((friend) => (
                    <div key={friend.id} className="friend-invite-card">
                      <div className="friend-info">
                        <img
                          src={friend.avatarUrl || "/placeholder-user.jpg"}
                          alt={friend.displayName}
                          className="friend-avatar"
                        />
                        <div className="friend-details">
                          <h4>{friend.displayName}</h4>
                          <p>{friend.email}</p>
                        </div>
                      </div>
                      <button
                        className="invite-btn"
                        onClick={() => handleInviteFriend(friend.id, friend.displayName)}
                        disabled={inviting === friend.id}
                      >
                        {inviting === friend.id ? (
                          <>
                            <div className="mini-spinner"></div>
                            Enviando...
                          </>
                        ) : (
                          "Convidar"
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="squad-modal-actions">
            <button
              type="button"
              className="squad-btn-secondary"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}