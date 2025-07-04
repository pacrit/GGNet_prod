"use client";
import React, { useEffect, useState } from "react";
import { Form, Input, Button, Alert, Select, Table, Tag } from "antd";
import { Modal, DatePicker } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/pt-br"; // Importar locale português
import weekday from "dayjs/plugin/weekday"; // Plugin weekday
import localeData from "dayjs/plugin/localeData"; // Plugin localeData
import { useAuth, AuthProvider } from "../contexts/AuthContext";

dayjs.extend(weekday);
dayjs.extend(localeData);
dayjs.locale("pt-br");

type LoLAccount = {
  riot_name: string;
  riot_tag: string;
  // outros campos se necessário
};

type MatchData = {
  gameId: string;
  gameCreation: number;
  gameDuration: number;
  gameMode: string;
  queueId: number;
  win: boolean;
  championName: string;
  championId: number;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealt: number;
  totalDamageDealtToChampions: number;
  goldEarned: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  summoner1Id: number;
  summoner2Id: number;
  riotIdGameName: string;
  riotIdTagline: string;
};

function LoLPage() {
  const { token, currentUser } = useAuth();
  const [lolData, setLoLData] = useState<LoLAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matches, setMatches] = useState<MatchData[] | null>(null);
  const [loadingRecentMatches, setLoadingRecentMatches] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchIntegration() {
      setLoading(true);
      const res = await fetch("/api/valorant", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLoLData(data.account || null);
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
      setLoLData(data.account);
    } else {
      setError("Não foi possível conectar à conta Riot.");
    }
  }

  async function fetchRecentMatches(values: {
    startTime: any;
    endTime: any;
    queue: string;
  }) {
    setLoadingRecentMatches(true);
    setError("");
    try {
      const res = await fetch("/api/lol/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          startTime: values.startTime.valueOf(), // timestamp
          endTime: values.endTime.valueOf(),
          queue: values.queue,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
        setShowMatchModal(false);
      } else {
        setError("Não foi possível buscar as partidas recentes.");
      }
    } finally {
      setLoadingRecentMatches(false);
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
      <div className="content-lol-page">
        <h3 className="lol-title">League of Legends</h3>
        {lolData ? (
          <div className="lol-connected-info">
            <div className="connected-header">
              <div className="success-icon">✓</div>
              <h4>Conta Conectada com Sucesso!</h4>
            </div>

            <div className="account-details">
              <div className="detail-row">
                <span className="detail-label">Nome Riot:</span>
                <span className="detail-value">{lolData.riot_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Tag:</span>
                <span className="detail-value">#{lolData.riot_tag}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Jogo:</span>
                <span className="detail-value game-badge">
                  <img src="/icon-lol.png" alt="LoL" width={20} height={20} />
                  League of Legends
                </span>
              </div>
            </div>

            <div className="lol-action-buttons">
              <Button onClick={() => setShowMatchModal(true)} type="primary">
                Ver Partidas Recentes
              </Button>
            </div>
            {/* Modal para filtros das partidas */}
            <Modal
              title="Filtrar Partidas Recentes"
              open={showMatchModal}
              onCancel={() => setShowMatchModal(false)}
              footer={null}
            >
              <Form
                layout="vertical"
                onFinish={fetchRecentMatches}
                initialValues={{
                  startTime: dayjs().subtract(7, "day"),
                  endTime: dayjs(),
                  queue: "420", // Ranked Solo/Duo
                }}
              >
                <Form.Item
                  label="Data de Início"
                  name="startTime"
                  rules={[
                    { required: true, message: "Selecione a data de início" },
                  ]}
                >
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item
                  label="Data de Fim"
                  name="endTime"
                  rules={[
                    { required: true, message: "Selecione a data de fim" },
                  ]}
                >
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item
                  label="Tipo de Partida"
                  name="queue"
                  rules={[
                    { required: true, message: "Selecione o tipo de partida" },
                  ]}
                >
                  <Select>
                    <Select.Option value="420">Ranked Solo/Duo</Select.Option>
                    <Select.Option value="440">Ranked Flex</Select.Option>
                    <Select.Option value="400">Normal Draft</Select.Option>
                    <Select.Option value="430">Normal Blind</Select.Option>
                    <Select.Option value="450">ARAM</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    block
                    loading={loadingRecentMatches}
                  >
                    Buscar Partidas
                  </Button>
                </Form.Item>
              </Form>
            </Modal>

            {/* Exibir partidas recentes */}
            {matches && (
              <div style={{ marginTop: 24 }}>
                <h4>Partidas Recentes ({matches.length})</h4>
                {/* Cards de Resumo */}
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    marginBottom: 24,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      background: "white",
                      padding: 16,
                      borderRadius: 8,
                      border: "1px solid #dadde1",
                      flex: 1,
                      minWidth: 200,
                    }}
                  >
                    <h5 style={{ margin: 0, color: "#667eea" }}>
                      Taxa de Vitória
                    </h5>
                    <p style={{ margin: 0, fontSize: 24, fontWeight: "bold" }}>
                      {(
                        (matches.filter((m) => m.win).length / matches.length) *
                        100
                      ).toFixed(1)}
                      %
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "#666" }}>
                      {matches.filter((m) => m.win).length}V /{" "}
                      {matches.filter((m) => !m.win).length}D
                    </p>
                  </div>

                  <div
                    style={{
                      background: "white",
                      padding: 16,
                      borderRadius: 8,
                      border: "1px solid #dadde1",
                      flex: 1,
                      minWidth: 200,
                    }}
                  >
                    <h5 style={{ margin: 0, color: "#667eea" }}>KDA Médio</h5>
                    <p style={{ margin: 0, fontSize: 24, fontWeight: "bold" }}>
                      {(
                        matches.reduce((acc, m) => acc + m.kills, 0) /
                        matches.length
                      ).toFixed(1)}{" "}
                      /
                      {(
                        matches.reduce((acc, m) => acc + m.deaths, 0) /
                        matches.length
                      ).toFixed(1)}{" "}
                      /
                      {(
                        matches.reduce((acc, m) => acc + m.assists, 0) /
                        matches.length
                      ).toFixed(1)}
                    </p>
                  </div>

                  <div
                    style={{
                      background: "white",
                      padding: 16,
                      borderRadius: 8,
                      border: "1px solid #dadde1",
                      flex: 1,
                      minWidth: 200,
                    }}
                  >
                    <h5 style={{ margin: 0, color: "#667eea" }}>
                      Campeão Mais Jogado
                    </h5>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: "bold" }}>
                      {(() => {
                        const champCount = matches.reduce(
                          (acc: Record<string, number>, match: MatchData) => {
                            acc[match.championName] =
                              (acc[match.championName] || 0) + 1;
                            return acc;
                          },
                          {}
                        );
                        const mostPlayed = Object.entries(champCount).sort(
                          (a, b) => (b[1] as number) - (a[1] as number)
                        )[0];
                        return mostPlayed
                          ? `${mostPlayed[0]} (${mostPlayed[1]}x)`
                          : "N/A";
                      })()}
                    </p>
                  </div>
                </div>
                <Table
                  dataSource={matches}
                  rowKey="gameId"
                  pagination={{ pageSize: 5 }}
                  bordered
                  scroll={{ x: 700 }} // Adicionar scroll horizontal
                  expandable={{
                    expandedRowRender: (record) => (
                      <div style={{ padding: 16 }}>
                        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                          <div>
                            <h5>Estatísticas Detalhadas</h5>
                            <p>
                              <strong>Dano Total:</strong>{" "}
                              {record.totalDamageDealt?.toLocaleString() || "N/A"}
                            </p>
                            <p>
                              <strong>Dano a Campeões:</strong>{" "}
                              {record.totalDamageDealtToChampions?.toLocaleString() || "N/A"}
                            </p>
                            <p>
                              <strong>Ouro Ganho:</strong>{" "}
                              {record.goldEarned?.toLocaleString() || "N/A"}
                            </p>
                            <p>
                              <strong>Modo de Jogo:</strong>{" "}
                              {record.gameMode || "N/A"}
                            </p>
                            <p>
                              <strong>Queue ID:</strong>{" "}
                              {record.queueId || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ),
                    rowExpandable: (record) => true,
                  }}
                  columns={[
                    {
                      title: "Data",
                      dataIndex: "gameCreation",
                      key: "gameCreation",
                      render: (timestamp) =>
                        dayjs(timestamp).format("DD/MM/YYYY HH:mm"),
                      width: 140,
                      //fixed: 'left', // Fixar coluna da esquerda
                    },
                    {
                      title: "Resultado",
                      dataIndex: "win",
                      key: "win",
                      width: 100,
                      render: (win) => (
                        <Tag
                          color={win ? "green" : "red"}
                          style={{ fontWeight: "bold" }}
                        >
                          {win ? "WIN" : "LOSS"}
                        </Tag>
                      ),
                    },
                    {
                      title: "Campeão",
                      dataIndex: "championName",
                      key: "championName",
                      width: 160,
                      render: (championName) => (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              backgroundColor: "#667eea",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                              fontSize: 10,
                              fontWeight: "bold",
                            }}
                          >
                            {championName?.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                              {championName}
                            </div>
                          </div>
                        </div>
                      ),
                    },
                    {
                      title: "KDA",
                      key: "kda",
                      width: 120,
                      render: (_, record: MatchData) => {
                        const kda =
                          record.deaths > 0
                            ? ((record.kills + record.assists) / record.deaths).toFixed(2)
                            : "Perfect";
                        const kdaColor =
                          typeof kda === "string" && kda !== "Perfect"
                            ? parseFloat(kda) >= 3
                              ? "green"
                              : parseFloat(kda) >= 2
                              ? "orange"
                              : "red"
                            : "gold";

                        return (
                          <div>
                            <div style={{ fontWeight: "bold", fontSize: '0.9rem' }}>
                              {record.kills}/{record.deaths}/{record.assists}
                            </div>
                            <Tag color={kdaColor}>
                              KDA: {kda}
                            </Tag>
                          </div>
                        );
                      },
                    },
                    {
                      title: "Duração",
                      dataIndex: "gameDuration",
                      key: "gameDuration",
                      width: 80,
                      render: (duration) => {
                        const minutes = Math.floor(duration / 60);
                        const seconds = duration % 60;
                        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
                      },
                    },
                    {
                      title: "Dano",
                      dataIndex: "totalDamageDealtToChampions",
                      key: "damage",
                      width: 80,
                      responsive: ['md'], // Esconder em telas pequenas
                      render: (damage) =>
                        damage ? `${(damage / 1000).toFixed(1)}k` : "N/A",
                    },
                    {
                      title: "Ouro",
                      dataIndex: "goldEarned",
                      key: "gold",
                      width: 80,
                      responsive: ['md'], // Esconder em telas pequenas
                      render: (gold) =>
                        gold ? `${(gold / 1000).toFixed(1)}k` : "N/A",
                    },
                  ]}
                />
              </div>
            )}
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

export default function LoLPageWrapper() {
  return (
    <AuthProvider>
      <LoLPage />
    </AuthProvider>
  );
}
