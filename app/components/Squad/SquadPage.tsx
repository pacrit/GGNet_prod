"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import CreateSquadModal from "./CreateSquadModal";
import SquadDetail from "./SquadDetail";
import SquadInvites from "./SquadInvites";

interface Squad {
  id: number;
  name: string;
  description: string;
  leader_id: number;
  max_members: number;
  main_games: string[];
  member_count: number;
  is_member: boolean;
  is_leader: boolean;
}

export default function SquadPage() {
  const { currentUser, token } = useAuth();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSquadId, setSelectedSquadId] = useState<number | null>(null);
  const [showInvites, setShowInvites] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (currentUser && token) {
      fetchSquads();
    }
  }, [currentUser, token]);

  const fetchSquads = async () => {
    try {
      const response = await fetch("/api/squads", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao buscar squads");
      }

      const data = await response.json();

      if (data.success) {
        setSquads(data.squads);
      } else {
        setError(data.error || "Erro ao carregar squads");
      }
    } catch (error) {
      console.error("Erro ao buscar squads:", error);
      setError("Erro ao carregar squads");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSquad = (squadId: number) => {
    console.log("Opening squad with ID:", squadId); // Debug
    setSelectedSquadId(squadId);
  };

  const handleBackToList = () => {
    setSelectedSquadId(null);
    setShowInvites(false);
    fetchSquads(); // Recarregar lista para atualizar contadores
  };

  const handleInviteProcessed = () => {
    setShowInvites(false);
    fetchSquads(); // Recarregar squads após aceitar convite
  };

  // Se convites estão sendo mostrados
  if (showInvites) {
    return (
      <div className="squad-container">
        <div className="squad-header">
          <button className="squad-back-btn" onClick={handleBackToList}>
            ← Voltar para Squads
          </button>
        </div>
        <SquadInvites onInviteProcessed={handleInviteProcessed} />
      </div>
    );
  }

  // Se um squad está selecionado, mostrar detalhes
  if (selectedSquadId) {
    return (
      <SquadDetail 
        squadId={selectedSquadId} 
        onBack={handleBackToList}
      />
    );
  }

  if (loading) {
    return (
      <div className="squad-container">
        <div className="squad-loading-center">
          <div className="loading-spinner"></div>
          <p>Carregando squads...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="squad-container">
        <div className="squad-error">
          <h3>Erro ao carregar squads</h3>
          <p>{error}</p>
          <button onClick={fetchSquads} className="squad-btn-primary">
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="squad-container">
      <div className="squad-header">
        <h1>🎮 Meus Squads</h1>
        <div className="squad-header-actions">
          <button 
            className="squad-btn-secondary"
            onClick={() => setShowInvites(true)}
          >
            📬 Convites
          </button>
          <button 
            className="create-squad-btn"
            onClick={() => setShowCreateModal(true)}
          >
            + Criar Squad
          </button>
        </div>
      </div>

      <div className="squad-grid">
        {squads.length === 0 ? (
          <div className="no-squads">
            <div className="no-squads-icon">🎮</div>
            <h3>Você ainda não faz parte de nenhum squad</h3>
            <p>Crie seu primeiro squad ou verifique se você tem convites pendentes!</p>
            <div className="no-squads-actions">
              <button 
                className="create-first-squad-btn"
                onClick={() => setShowCreateModal(true)}
              >
                Criar Primeiro Squad
              </button>
            </div>
          </div>
        ) : (
          squads.map((squad) => (
            <div key={squad.id} className="squad-card">
              <div className="squad-info">
                <h3>{squad.name}</h3>
                <p>{squad.description || "Sem descrição"}</p>
                <div className="squad-games">
                  {squad.main_games.map((game, index) => (
                    <span key={index} className="game-tag">{game}</span>
                  ))}
                </div>
                <div className="squad-stats">
                  <span>👥 {squad.member_count}/{squad.max_members}</span>
                  {squad.is_leader && <span className="leader-badge">👑 Líder</span>}
                </div>
              </div>
              <div className="squad-actions">
                <button 
                  className="squad-btn primary"
                  onClick={() => handleOpenSquad(squad.id)}
                >
                  Abrir Squad
                </button>
                <button 
                  className="squad-btn secondary"
                  onClick={() => {
                    // Implementar navegação direta para o chat
                    setSelectedSquadId(squad.id);
                    // Ou criar um estado separado para mostrar chat
                  }}
                >
                  💬 Chat
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <CreateSquadModal 
          onClose={() => setShowCreateModal(false)}
          onCreated={(newSquad) => {
            setSquads(prev => [...prev, newSquad]);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}