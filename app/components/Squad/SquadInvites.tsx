"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";

interface SquadInvite {
  id: number;
  message: string;
  created_at: string;
  from_user_id: number;
  inviter_name: string;
  inviter_avatar?: string;
  squad_id: number;
  squad_name: string;
  squad_description?: string;
  max_members: number;
  current_members: number;
}

interface SquadInvitesProps {
  onInviteProcessed?: () => void;
}

export default function SquadInvites({ onInviteProcessed }: SquadInvitesProps) {
  const { token } = useAuth();
  const [invites, setInvites] = useState<SquadInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      const response = await fetch("/api/squad-invites", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setInvites(data.invites);
      } else {
        setError("Erro ao carregar convites");
      }
    } catch (error) {
      console.error("Erro ao buscar convites:", error);
      setError("Erro ao carregar convites");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteAction = async (inviteId: number, action: 'accept' | 'decline') => {
    setProcessing(inviteId);
    setError("");

    try {
      const response = await fetch("/api/squad-invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          inviteId,
          action,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Remover convite da lista
        setInvites(prev => prev.filter(invite => invite.id !== inviteId));
        
        // Notificar componente pai se necessário
        if (onInviteProcessed) {
          onInviteProcessed();
        }
      } else {
        setError(data.error || "Erro ao processar convite");
      }
    } catch (error) {
      console.error("Erro ao processar convite:", error);
      setError("Erro ao processar convite");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="squad-invites-container">
        <div className="squad-loading-center">
          <div className="loading-spinner"></div>
          <p>Carregando convites...</p>
        </div>
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div className="squad-invites-container">
        <div className="no-invites">
          <h3>📬 Nenhum convite pendente</h3>
          <p>Você não tem convites de squad no momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="squad-invites-container">
      <h2>📬 Convites de Squad ({invites.length})</h2>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="invites-list">
        {invites.map((invite) => (
          <div key={invite.id} className="invite-card">
            <div className="invite-header">
              <div className="inviter-info">
                <img
                  src={invite.inviter_avatar || "/placeholder-user.jpg"}
                  alt={invite.inviter_name}
                  className="inviter-avatar"
                />
                <div className="inviter-details">
                  <h4>{invite.inviter_name} te convidou</h4>
                  <p className="invite-time">
                    {new Date(invite.created_at).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(invite.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="squad-invite-info">
              <h3>🎮 {invite.squad_name}</h3>
              <p>{invite.squad_description || "Sem descrição"}</p>
              <div className="squad-invite-stats">
                <span>👥 {invite.current_members}/{invite.max_members} membros</span>
              </div>
            </div>

            <div className="invite-actions">
              <button
                className="invite-btn accept"
                onClick={() => handleInviteAction(invite.id, 'accept')}
                disabled={processing === invite.id}
              >
                {processing === invite.id ? (
                  <>
                    <div className="mini-spinner"></div>
                    Processando...
                  </>
                ) : (
                  "✅ Aceitar"
                )}
              </button>
              <button
                className="invite-btn decline"
                onClick={() => handleInviteAction(invite.id, 'decline')}
                disabled={processing === invite.id}
              >
                ❌ Recusar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}