"use client";
import { useState, useEffect } from "react";
import { 
  Card, 
  Avatar, 
  List, 
  Tag, 
  Button, 
  Select, 
  Space, 
  Typography, 
  Tooltip,
  Badge,
  Divider,
  Modal,
  message
} from "antd";
import { 
  CrownOutlined, 
  StarOutlined, 
  UserOutlined, 
  DeleteOutlined,
  CalendarOutlined,
  LoadingOutlined
} from "@ant-design/icons";
import { useAuth } from "../../contexts/AuthContext";
import InviteFriendModal from "./InviteFriendModal";
import SquadChat from "./SquadChat";
import GameSessions from "./GameSessions";

const { Title, Text } = Typography;
const { Option } = Select;

interface SquadDetails {
  id: number;
  name: string;
  description: string;
  leader_id: number;
  max_members: number;
  main_games: string[];
  created_at: string;
  leader_name: string;
  leader_avatar?: string;
  member_count: number;
  is_leader: boolean;
}

interface SquadMember {
  id: number;
  user_id: number;
  role: string;
  joined_at: string;
  display_name: string;
  email: string;
  avatar_url?: string;
}

interface SquadDetailProps {
  squadId: number;
  onBack: () => void;
}

export default function SquadDetail({ squadId, onBack }: SquadDetailProps) {
  const { currentUser, token } = useAuth();
  const [squad, setSquad] = useState<SquadDetails | null>(null);
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [changingRole, setChangingRole] = useState<number | null>(null); // Para loading state

  useEffect(() => {
    console.log("SquadDetail - useEffect triggered with squadId:", squadId);
    if (squadId && token) {
      fetchSquadDetails();
      fetchMembers();
    }
  }, [squadId, token]);

  const fetchSquadDetails = async () => {
    try {
      console.log("Fetching squad details for ID:", squadId);
      
      const response = await fetch(`/api/squads/${squadId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Squad details response status:", response.status);
      
      const data = await response.json();
      console.log("Squad details response data:", data);

      if (data.success) {
        setSquad(data.squad);
        setUserRole(data.userRole);
        console.log("Squad data set successfully:", data.squad);
      } else {
        setError(data.error || "Erro ao carregar detalhes do squad");
        console.error("Error in squad details response:", data.error);
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes do squad:", error);
      setError("Erro ao carregar squad");
    }
  };

  const fetchMembers = async () => {
    try {
      console.log("Fetching members for squad ID:", squadId);
      
      const response = await fetch(`/api/squads/${squadId}/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Members response status:", response.status);
      
      const data = await response.json();
      console.log("Members response data:", data);

      if (data.success) {
        setMembers(data.members);
        console.log("Members data set successfully:", data.members);
      } else {
        console.error("Error fetching members:", data.error);
        // Não definir erro aqui, pois os detalhes do squad podem carregar independentemente
      }
    } catch (error) {
      console.error("Erro ao buscar membros:", error);
      // Não definir erro aqui também
    } finally {
      setLoading(false); // Importante: sempre definir loading como false
      console.log("Loading set to false");
    }
  };

  const handleLeaveSquad = async () => {
    if (!confirm("Tem certeza que deseja sair do squad?")) return;

    try {
      const response = await fetch(`/api/squads/${squadId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        onBack(); // Volta para a lista de squads
      } else {
        setError(data.error || "Erro ao sair do squad");
      }
    } catch (error) {
      console.error("Erro ao sair do squad:", error);
      setError("Erro ao sair do squad");
    }
  };

  // 🆕 Função para determinar se pode alterar cargo
  const canChangeRole = (member: SquadMember) => {
    // Não pode alterar o próprio cargo
    if (member.user_id === currentUser?.id) return false;
    
    // Leader pode alterar qualquer cargo (exceto outros leaders)
    if (userRole === "leader" && member.role !== "leader") return true;
    
    // Moderator pode alterar apenas membros comuns
    if (userRole === "moderator" && member.role === "member") return true;
    
    return false;
  };

  // 🆕 Função para obter opções de cargo
  const getRoleOptions = (member: SquadMember) => {
    const options: { value: string; label: string }[] = [];
    
    if (userRole === "leader") {
      // Leader pode promover para moderador ou rebaixar para membro
      if (member.role === "member") {
        options.push({ value: "moderator", label: "⭐ Moderador" });
      } else if (member.role === "moderator") {
        options.push({ value: "member", label: "👤 Membro" });
      }
    } else if (userRole === "moderator") {
      // Moderator pode apenas promover membros para moderador
      if (member.role === "member") {
        options.push({ value: "moderator", label: "⭐ Moderador" });
      }
    }
    
    return options;
  };

  // 🆕 Função para alterar cargo
  const handleRoleChange = async (memberId: number, newRole: string) => {
    const roleLabel = newRole === 'moderator' ? 'Moderador' : 'Membro';
    
    Modal.confirm({
      title: 'Alterar Cargo',
      content: `Tem certeza que deseja alterar o cargo deste membro para ${roleLabel}?`,
      okText: 'Sim, alterar',
      cancelText: 'Cancelar',
      onOk: async () => {
        setChangingRole(memberId);

        try {
          const response = await fetch(`/api/squads/${squadId}/members/${memberId}/role`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ role: newRole }),
          });

          const data = await response.json();

          if (data.success) {
            // Atualizar a lista de membros
            setMembers(prevMembers =>
              prevMembers.map(member =>
                member.id === memberId
                  ? { ...member, role: newRole }
                  : member
              )
            );
            
            message.success(`Cargo alterado com sucesso para ${roleLabel}!`);
          } else {
            message.error(data.error || "Erro ao alterar cargo");
          }
        } catch (error) {
          console.error("Erro ao alterar cargo:", error);
          message.error("Erro ao alterar cargo");
        } finally {
          setChangingRole(null);
        }
      }
    });
  };

  // 🆕 Função para remover membro
  const handleRemoveMember = async (memberId: number, memberName: string) => {
    Modal.confirm({
      title: 'Remover Membro',
      content: `Tem certeza que deseja remover ${memberName} do squad?`,
      okText: 'Sim, remover',
      cancelText: 'Cancelar',
      okType: 'danger',
      onOk: async () => {
        try {
          const response = await fetch(`/api/squads/${squadId}/members/${memberId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const data = await response.json();

          if (data.success) {
            setMembers(prevMembers => 
              prevMembers.filter(member => member.id !== memberId)
            );
            message.success(`${memberName} foi removido do squad`);
          } else {
            message.error(data.error || "Erro ao remover membro");
          }
        } catch (error) {
          console.error("Erro ao remover membro:", error);
          message.error("Erro ao remover membro");
        }
      }
    });
  };

  // 🆕 Obter ícone e cor do cargo
  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'leader':
        return {
          icon: <CrownOutlined />,
          color: '#faad14',
          label: '👑 Líder',
          tag: 'gold'
        };
      case 'moderator':
        return {
          icon: <StarOutlined />,
          color: '#52c41a',
          label: '⭐ Moderador',
          tag: 'green'
        };
      default:
        return {
          icon: <UserOutlined />,
          color: '#1890ff',
          label: '👤 Membro',
          tag: 'blue'
        };
    }
  };

  // 🆕 Renderizar cargo com Select
  const renderRoleBadge = (member: SquadMember) => {
    const canChange = canChangeRole(member);
    const isChanging = changingRole === member.id;
    const roleConfig = getRoleConfig(member.role);
    
    if (canChange && !isChanging) {
      const options = getRoleOptions(member);
      
      return (
        <Space direction="vertical" size="small">
          <Tag color={roleConfig.tag} icon={roleConfig.icon}>
            {roleConfig.label}
          </Tag>
          {options.length > 0 && (
            <Select
              placeholder="Alterar cargo..."
              size="small"
              style={{ width: 120 }}
              onChange={(value) => handleRoleChange(member.id, value)}
            >
              {options.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          )}
        </Space>
      );
    }

    // Cargo fixo ou carregando
    return (
      <Tag 
        color={roleConfig.tag} 
        icon={isChanging ? <LoadingOutlined /> : roleConfig.icon}
      >
        {isChanging ? 'Alterando...' : roleConfig.label}
      </Tag>
    );
  };

  // Se o chat está sendo mostrado
  if (showChat && squad) {
    return (
      <SquadChat
        squadId={squadId}
        squadName={squad.name}
        onBack={() => setShowChat(false)}
      />
    );
  }

  // Se as sessões estão sendo mostradas
  if (showSessions && squad) {
    return (
      <GameSessions
        squadId={squadId}
        squadName={squad.name}
        userRole={userRole}
        onBack={() => setShowSessions(false)}
      />
    );
  }

  console.log("Render state:", { loading, squad, members, error });

  if (loading) {
    return (
      <div className="squad-detail-container">
        <div className="squad-loading-center">
          <div className="loading-spinner"></div>
          <p>Carregando squad...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="squad-detail-container">
        <div className="squad-error">
          <h3>Erro</h3>
          <p>{error}</p>
          <button onClick={onBack} className="squad-btn-secondary">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!squad) {
    return (
      <div className="squad-detail-container">
        <div className="squad-error">
          <h3>Squad não encontrado</h3>
          <button onClick={onBack} className="squad-btn-secondary">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="squad-detail-container">
      <div className="squad-detail-header">
        <button className="squad-back-btn" onClick={onBack}>
          ← Voltar
        </button>
        <div className="squad-detail-actions">
          {(userRole === "leader" || userRole === "moderator") && (
            <button
              className="squad-btn-primary"
              onClick={() => setShowInviteModal(true)}
            >
              + Convidar Amigo
            </button>
          )}
          <button 
            className="squad-btn-secondary" 
            onClick={() => setShowChat(true)}  // <- Mudança aqui
          >
            💬 Chat
          </button>
          <button 
            className="squad-btn-secondary" 
            onClick={() => setShowSessions(true)}
          >
            🎮 Sessões
          </button>
          {userRole !== "leader" && (
            <button className="squad-btn-danger" onClick={handleLeaveSquad}>
              Sair do Squad
            </button>
          )}
        </div>
      </div>

      <div className="squad-detail-content">
        <div className="squad-info-section">
          <div className="squad-main-info">
            <h1>{squad.name}</h1>
            <p className="squad-description">{squad.description}</p>
            
            <div className="squad-stats">
              <div className="stat-item">
                <span className="stat-label">👥 Membros:</span>
                <span className="stat-value">{squad.member_count}/{squad.max_members}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">👑 Líder:</span>
                <span className="stat-value">{squad.leader_name}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">📅 Criado:</span>
                <span className="stat-value">
                  {new Date(squad.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>

            <div className="squad-games">
              <h3>🎮 Jogos Principais:</h3>
              <div className="games-list">
                {squad.main_games.map((game, index) => (
                  <span key={index} className="game-tag">{game}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Seção de Membros com Ant Design */}
        <Card 
          title={
            <Space>
              <UserOutlined />
              <Title level={4} style={{ margin: 0 }}>
                Membros ({members.length})
              </Title>
            </Space>
          }
          style={{ marginTop: '24px' }}
        >
          <List
            dataSource={members}
            renderItem={(member) => (
              <List.Item
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  background: member.user_id === currentUser?.id 
                    ? 'rgba(24, 144, 255, 0.1)' 
                    : 'rgba(255, 255, 255, 0.02)',
                  border: member.user_id === currentUser?.id 
                    ? '1px solid rgba(24, 144, 255, 0.3)' 
                    : '1px solid rgba(255, 255, 255, 0.1)'
                }}
                actions={[
                  <Space key="actions">
                    {(userRole === "leader" || userRole === "moderator") && 
                     member.role === "member" && 
                     member.user_id !== currentUser?.id && (
                      <Tooltip title="Remover membro">
                        <Button 
                          type="text" 
                          danger 
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveMember(member.id, member.display_name)}
                        />
                      </Tooltip>
                    )}
                  </Space>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Badge 
                      dot={member.user_id === currentUser?.id}
                      color="#52c41a"
                    >
                      <Avatar 
                        src={member.avatar_url || "/placeholder-user.jpg"}
                        size={60}
                      />
                    </Badge>
                  }
                  title={
                    <Space>
                      <Text strong style={{ fontSize: '16px' }}>
                        {member.display_name}
                      </Text>
                      {member.user_id === currentUser?.id && (
                        <Tag color="cyan" >Você</Tag>
                      )}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small">
                      <div>
                        {renderRoleBadge(member)}
                      </div>
                      <Space>
                        <CalendarOutlined style={{ color: '#666' }} />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Desde {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                        </Text>
                      </Space>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      </div>

      {/* Modal de Convite */}
      {showInviteModal && squad && (
        <InviteFriendModal 
          onClose={() => setShowInviteModal(false)}
          squadId={squadId}
          squadName={squad.name}
        />
      )}
    </div>
  );
}