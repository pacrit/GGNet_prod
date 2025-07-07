"use client";
import { useState, useEffect } from "react";
import { 
  Button, 
  Card, 
  Empty, 
  Spin, 
  Alert, 
  Badge, 
  Space, 
  Typography, 
  Avatar,
  Row,
  Col,
  Divider,
  Tag,
  message
} from "antd";
import { 
  ArrowLeftOutlined, 
  PlusOutlined, 
  ThunderboltOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from "@ant-design/icons";
import { useAuth } from "../../contexts/AuthContext";
import CreateSessionModal from "./CreateSessionModal";

const { Title, Text, Paragraph } = Typography;

interface GameSession {
  id: number;
  title: string;
  description?: string;
  game_name: string;
  scheduled_date: string;
  duration_minutes: number;
  max_participants: number;
  status: string;
  creator_name: string;
  creator_avatar?: string;
  total_participants: number;
  confirmed_participants: number;
  user_status?: string;
}

interface GameSessionsProps {
  squadId: number;
  squadName: string;
  userRole: string;
  onBack: () => void;
}

export default function GameSessions({
  squadId,
  squadName,
  userRole,
  onBack,
}: GameSessionsProps) {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [processingSession, setProcessingSession] = useState<number | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [squadId]);

  const fetchSessions = async () => {
    try {
      const response = await fetch(`/api/squads/${squadId}/sessions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setSessions(data.sessions);
      } else {
        setError(data.error || "Erro ao carregar sessões");
      }
    } catch (error) {
      console.error("Erro ao buscar sessões:", error);
      setError("Erro ao carregar sessões");
    } finally {
      setLoading(false);
    }
  };

  const handleParticipation = async (
    sessionId: number,
    status: "confirmed" | "declined"
  ) => {
    setProcessingSession(sessionId);

    try {
      const response = await fetch(
        `/api/squads/${squadId}/sessions/${sessionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (data.success) {
        message.success(
          status === 'confirmed' 
            ? "Participação confirmada com sucesso!" 
            : "Participação recusada"
        );
        fetchSessions();
      } else {
        message.error(data.error || "Erro ao atualizar participação");
      }
    } catch (error) {
      console.error("Erro ao atualizar participação:", error);
      message.error("Erro ao atualizar participação");
    } finally {
      setProcessingSession(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (session: GameSession) => {
    const now = new Date();
    const sessionDate = new Date(session.scheduled_date);

    if (sessionDate < now) {
      return <Badge status="default" text="Passada" />;
    }

    if (session.user_status === "confirmed") {
      return <Badge status="success" text="Confirmado" />;
    }

    if (session.user_status === "declined") {
      return <Badge status="error" text="Recusado" />;
    }

    return <Badge status="warning" text="Pendente" />;
  };

  const getParticipantsColor = (session: GameSession) => {
    const ratio = session.confirmed_participants / session.max_participants;
    if (ratio >= 0.8) return "success";
    if (ratio >= 0.5) return "warning";
    return "default";
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text>Carregando sessões...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <Space>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={onBack}
            size="large"
          >
            Voltar
          </Button>
          <Title level={2} style={{ margin: 0, color: '#666' }}>
            🎮 Sessões - {squadName}
          </Title>
        </Space>
        
        {(userRole === "leader" || userRole === "moderator") && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => setShowCreateModal(true)}
            style={{
              background: 'linear-gradient(45deg, #00d4ff, #0099cc)',
              border: 'none',
            }}
          >
            Nova Sessão
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError("")}
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* Sessions Content */}
      {sessions.length === 0 ? (
        <Empty
          image={<ThunderboltOutlined style={{ fontSize: '64px', color: '#00d4ff' }} />}
          description={
            <div>
              <Title level={3} style={{ color: '#666' }}>
                Nenhuma sessão agendada
              </Title>
            </div>
          }
        >
          {(userRole === "leader" || userRole === "moderator") && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={() => setShowCreateModal(true)}
              style={{
                background: 'linear-gradient(45deg, #00d4ff, #0099cc)',
                border: 'none',
              }}
            >
              Criar Primeira Sessão
            </Button>
          )}
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {sessions.map((session) => (
            <Col xs={24} sm={12} lg={8} key={session.id}>
              <Card
                hoverable
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                }}
                bodyStyle={{ padding: '20px' }}
              >
                {/* Session Header */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '16px'
                }}>
                  <div style={{ flex: 1 }}>
                    <Title level={4} style={{ margin: 0, color: '#666' }}>
                      {session.title}
                    </Title>
                    <Text type="secondary">
                      🎮 {session.game_name}
                    </Text>
                  </div>
                  <div style={{ marginLeft: '12px' }}>
                    {getStatusBadge(session)}
                  </div>
                </div>

                {/* Session Info */}
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CalendarOutlined style={{ color: '#00d4ff' }} />
                    <Text style={{ color: '#666' }}>
                      {formatDate(session.scheduled_date)}
                    </Text>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ClockCircleOutlined style={{ color: '#00d4ff' }} />
                    <Text style={{ color: '#666' }}>
                      {session.duration_minutes} minutos
                    </Text>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserOutlined style={{ color: '#00d4ff' }} />
                    <Tag color={getParticipantsColor(session)}>
                      {session.confirmed_participants}/{session.max_participants} confirmados
                    </Tag>
                  </div>
                </Space>

                {/* Description */}
                {session.description && (
                  <>
                    <Divider style={{ margin: '16px 0' }} />
                    <Paragraph 
                      style={{ 
                        color: '#ccc', 
                        fontSize: '14px',
                        margin: 0
                      }}
                      ellipsis={{ rows: 2, expandable: true }}
                    >
                      {session.description}
                    </Paragraph>
                  </>
                )}

                {/* Creator */}
                <Divider style={{ margin: '16px 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Avatar 
                    src={session.creator_avatar || "/placeholder-user.jpg"} 
                    size="small"
                  />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Criado por {session.creator_name}
                  </Text>
                </div>

                {/* Actions */}
                {new Date(session.scheduled_date) > new Date() && (
                  <>
                    <Divider style={{ margin: '16px 0' }} />
                    <Space style={{ width: '100%' }}>
                      {session.user_status !== "confirmed" && (
                        <Button
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          loading={processingSession === session.id}
                          onClick={() => handleParticipation(session.id, "confirmed")}
                          disabled={
                            session.confirmed_participants >= session.max_participants
                          }
                          style={{
                            background: 'linear-gradient(45deg, #52c41a, #389e0d)',
                            border: 'none',
                            flex: 1,
                          }}
                        >
                          Confirmar
                        </Button>
                      )}
                      
                      {session.user_status !== "declined" && (
                        <Button
                          danger
                          icon={<CloseCircleOutlined />}
                          loading={processingSession === session.id}
                          onClick={() => handleParticipation(session.id, "declined")}
                          style={{ flex: 1 }}
                        >
                          Recusar
                        </Button>
                      )}
                    </Space>
                  </>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Create Session Modal */}
      <CreateSessionModal
        squadId={squadId}
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          setShowCreateModal(false);
          fetchSessions();
        }}
      />
    </div>
  );
}