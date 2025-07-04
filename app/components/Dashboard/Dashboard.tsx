"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import UserCard from "./UserCard";
import { Modal, Button } from "antd";
import AsyncSelect from "react-select/async";

interface DashboardProps {
  onOpenChat: (recipientId: number, recipientName: string) => void;
}

interface UserData {
  id: number;
  email: string;
  displayName: string;
  avatar_url?: string;
  createdAt: string;
}

type UserOption = {
  value: number;
  label: string;
  user: UserData;
};

export default function Dashboard({ onOpenChat }: DashboardProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [modalUser, setModalUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const { token, currentUser } = useAuth();

  useEffect(() => {
    fetchFriends();
  }, [token]);

  const loadUserOptions = async (inputValue: string) => {
    if (!inputValue || inputValue.length < 1) return [];
    const res = await fetch(
      `/api/users?search=${encodeURIComponent(inputValue)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await res.json();
    // Exclua amigos já existentes e você mesmo, se quiser
    return (data.users || []).map((u: UserData) => ({
      value: u.id,
      label: u.displayName,
      user: u,
    }));
  };

  const fetchFriends = async () => {
    if (!token) return;

    try {
      const response = await fetch("/api/friends", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const usersData = await response.json();
        setUsers(Array.isArray(usersData.users) ? usersData.users : []);
      }
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Carregando usuários...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Conecte-se com outros jogadores</h2>
        <p>Encontre e converse com pessoas que curtem o mesmo que você!</p>
      </div>

      <div className="add-friend-section">
        <AsyncSelect<UserOption, false>
          isClearable
          cacheOptions
          loadOptions={loadUserOptions}
          placeholder="Buscar usuário para adicionar..."
          onChange={(option) => {
            if (option && "user" in option) {
              setModalUser(option.user);
            } else {
              setModalUser(null);
            }
          }}
          noOptionsMessage={() => "Digite para buscar usuários"}
        />
      </div>
      <div className="users-grid">
        {users.length === 0 ? (
          <div className="no-users">
            <p>Nenhum usuário encontrado.</p>
            <p>Seja o primeiro a se conectar!</p>
          </div>
        ) : (
          users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onOpenChat={(id, name) => onOpenChat(id, name)}
            />
          ))
        )}
      </div>
      {/* Modal para convite de amizade */}
      <Modal
        open={!!modalUser}
        onCancel={() => setModalUser(null)}
        footer={null}
        title="Adicionar Amigo"
      >
        {modalUser && (
          <div>
            <h3>{modalUser.displayName}</h3>
            <p>Este usuário ainda não é seu amigo.</p>
            <Button
              className="send-friend-request-button"
              onClick={async () => {
                // 1. Inserir convite de amizade (status pendente)
                await fetch("/api/friends/invite", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    friendId: modalUser.id,
                  }),
                });

                // 2. Criar notificação com informações do remetente
                await fetch("/api/notification", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    user_id: modalUser.id,
                    type: "friend_request",
                    message: `${currentUser?.displayName} enviou um pedido de amizade!`,
                    link: `/profile/${currentUser?.id}`,
                    from_user_id: currentUser?.id, // Adicionar ID do remetente
                  }),
                });

                setModalUser(null);
                alert("Convite enviado!");
              }}
            >
              Enviar convite de amizade
            </Button>
            <Button
              color="danger"
              variant="outlined"
              onClick={() => setModalUser(null)}
            >
              Cancelar
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
