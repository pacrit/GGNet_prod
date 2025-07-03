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
          <div>
            <p>Conta já conectada!</p>
            <p>
              <b>Nome:</b> {valorantData.riot_name}#{valorantData.riot_tag}
            </p>
            <Button
              onClick={fetchLeaderboard}
              loading={loadingMatches}
              style={{ marginTop: 16 }}
            >
              Consultar histórico de partidas
            </Button>
            {leaderboard && (
              <div style={{ marginTop: 24 }}>
                <h4>Top 200 Jogadores do Ato Atual</h4>
                <Table
                  dataSource={leaderboard}
                  rowKey="puuid"
                  pagination={{ pageSize: 10 }}
                  bordered
                  columns={[
                    {
                      title: "Posição",
                      dataIndex: "leaderboardRank",
                      key: "leaderboardRank",
                      width: 90,
                    },
                    {
                      title: "Jogador",
                      dataIndex: "gameName",
                      key: "gameName",
                      render: (text, record) => (
                        <span>
                          <Avatar
                            style={{
                              backgroundColor: "#1677ff",
                              marginRight: 8,
                            }}
                          >
                            {text?.charAt(0).toUpperCase()}
                          </Avatar>
                          {text}#{record.tagLine}
                        </span>
                      ),
                    },
                    {
                      title: "Pontos Ranqueados",
                      dataIndex: "rankedRating",
                      key: "rankedRating",
                      width: 120,
                    },
                    {
                      title: "Vitórias",
                      dataIndex: "numberOfWins",
                      key: "numberOfWins",
                      width: 90,
                    },
                    {
                      title: "Status",
                      dataIndex: "isBanned",
                      key: "isBanned",
                      width: 90,
                      render: (isBanned) =>
                        isBanned ? (
                          <Tag color="red">Banido</Tag>
                        ) : (
                          <Tag color="green">OK</Tag>
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
