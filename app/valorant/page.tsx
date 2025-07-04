"use client";
import React, { useEffect, useState } from "react";
import { Form, Input, Button, Alert, Select } from "antd";
import { Table, Tag, Avatar } from "antd";
import { useAuth, AuthProvider } from "../contexts/AuthContext";

type ValorantAccount = {
  riot_name: string;
  riot_tag: string;
  // outros campos se necessário
};

function ValorantPage() {
  const { token, currentUser } = useAuth();
  const [valorantData, setValorantData] = useState<ValorantAccount | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<any[] | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchIntegration() {
      setLoading(true);
      const res = await fetch("/api/valorant", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setValorantData(data.account || null);
      }
      setLoading(false);
    }
    if (token) fetchIntegration();
  }, [token]);

  async function handleConnect(values: {
    riotRegion: string;
    riotName: string;
    riotTag: string;
  }) {
    setError("");
    const res = await fetch("/api/valorant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        riotRegion: values.riotRegion,
        riotName: values.riotName,
        riotTag: values.riotTag,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setValorantData(data.account);
    } else {
      setError("Não foi possível conectar à conta Valorant.");
    }
  }

  async function fetchLeaderboard() {
    setLoadingMatches(true);
    setError("");
    try {
      const res = await fetch("/api/valorant/leaderboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      } else {
        setError("Não foi possível buscar o histórico de partidas.");
      }
    } finally {
      setLoadingMatches(false);
    }
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <div>
      <button
        className="profile-back-btn"
        onClick={() => (window.location.href = "/")}
      >
        <span>←</span> Voltar
      </button>
      <div className="content-valorant-page">
        <h3 className="valorant-title">Valorant</h3>
        {valorantData ? (
          <div className="valorant-connected-info">
            <div className="connected-header">
              <div className="success-icon">✓</div>
              <h4>Conta Conectada com Sucesso!</h4>
            </div>

            <div className="account-details">
              <div className="detail-row">
                <span className="detail-label">Nome Riot:</span>
                <span className="detail-value">{valorantData.riot_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Tag:</span>
                <span className="detail-value">#{valorantData.riot_tag}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Jogo:</span>
                <span className="detail-value game-badge">
                  <img
                    src="/icon-val.png"
                    alt="Valorant"
                    width={20}
                    height={20}
                  />
                  Valorant
                </span>
              </div>
            </div>

            <div className="valorant-action-buttons">
              <Button
                onClick={fetchLeaderboard}
                loading={loadingMatches}
                type="primary"
              >
                Consultar Leaderboard
              </Button>
            </div>
            {leaderboard && (
              <div style={{ marginTop: 24 }}>
                <h4>Top 200 Jogadores do Ato Atual</h4>
                <Table
                  dataSource={leaderboard}
                  rowKey="puuid"
                  pagination={{ pageSize: 10 }}
                  bordered
                  scroll={{ x: 600 }} // Adicionar scroll horizontal
                  columns={[
                    {
                      title: "Pos",
                      dataIndex: "leaderboardRank",
                      key: "leaderboardRank",
                      width: 60,
                      fixed: "left", // Fixar coluna da esquerda
                    },
                    {
                      title: "Jogador",
                      dataIndex: "gameName",
                      key: "gameName",
                      width: 200,
                      render: (text, record) => (
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <Avatar
                            style={{
                              backgroundColor: "#1677ff",
                              marginRight: 8,
                            }}
                            size="small"
                          >
                            {text?.charAt(0).toUpperCase()}
                          </Avatar>
                          <div>
                            <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>
                              {text}
                            </div>
                            <div style={{ fontSize: "0.7rem", color: "#666" }}>
                              #{record.tagLine}
                            </div>
                          </div>
                        </div>
                      ),
                    },
                    {
                      title: "RR",
                      dataIndex: "rankedRating",
                      key: "rankedRating",
                      width: 80,
                      render: (rating) => (
                        <span style={{ fontWeight: "bold", color: "#1677ff" }}>
                          {rating}
                        </span>
                      ),
                    },
                    {
                      title: "Wins",
                      dataIndex: "numberOfWins",
                      key: "numberOfWins",
                      width: 70,
                      responsive: ["md"], // Esconder em telas pequenas
                    },
                    {
                      title: "Status",
                      dataIndex: "isBanned",
                      key: "isBanned",
                      width: 70,
                      render: (isBanned) =>
                        isBanned ? (
                          <Tag color="red" >
                            Ban
                          </Tag>
                        ) : (
                          <Tag color="green">
                            OK
                          </Tag>
                        ),
                    },
                  ]}
                />
              </div>
            )}
            {error && <Alert message={error} type="error" showIcon />}
          </div>
        ) : (
          <Form
            layout="vertical"
            onFinish={handleConnect}
            style={{ maxWidth: 320, marginTop: 24 }}
          >
            <Form.Item
              label="Região"
              name="riotRegion"
              rules={[{ required: true, message: "Selecione a região" }]}
            >
              <Select
                defaultValue="americas"
                options={[
                  { value: "americas", label: "Américas" },
                  { value: "europe", label: "Europa" },
                  { value: "asia", label: "Ásia" },
                ]}
              />
            </Form.Item>
            <Form.Item
              label="Nome Riot"
              name="riotName"
              rules={[{ required: true, message: "Digite seu nome Riot" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Tag Riot"
              name="riotTag"
              rules={[{ required: true, message: "Digite sua tag Riot" }]}
            >
              <Input addonBefore="#" />
            </Form.Item>
            {error && (
              <Form.Item>
                <Alert message={error} type="error" showIcon />
              </Form.Item>
            )}
            <Form.Item>
              <Button
                className="btn-connect-valorant-account"
                type="primary"
                htmlType="submit"
                block
              >
                Conectar
              </Button>
            </Form.Item>
          </Form>
        )}
      </div>
    </div>
  );
}

export default function ValorantPageWrapper() {
  return (
    <AuthProvider>
      <ValorantPage />
    </AuthProvider>
  );
}
