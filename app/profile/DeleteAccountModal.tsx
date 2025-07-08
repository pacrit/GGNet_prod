"use client";

import { useState } from "react";
import {
  Modal,
  Form,
  Input,
  Button,
  message,
  Alert,
  Checkbox,
  Space,
} from "antd";
import {
  DeleteOutlined,
  LockOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";

interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DeleteAccountModal({
  open,
  onClose,
}: DeleteAccountModalProps) {
  const { currentUser, token, logout } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteAccount = async (values: any) => {
    if (!confirmDelete) {
      message.error("Você deve confirmar que deseja excluir sua conta");
      return;
    }

    setLoading(true);

    try {
      // 🔧 Atualizar URL para /api/users
      const response = await fetch("/api/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password: values.password,
          confirmation: values.confirmation,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        message.success("Conta excluída com sucesso");
        logout();
        window.location.href = "/login";
      } else {
        message.error(data.error || "Erro ao excluir conta");
      }
    } catch (error) {
      console.error("Erro ao excluir conta:", error);
      message.error("Erro ao excluir conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#ff4d4f",
          }}
        >
          <DeleteOutlined />
          <span>Excluir Conta</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      <Alert
        message="⚠️ AÇÃO IRREVERSÍVEL"
        description="Esta ação não pode ser desfeita. Todos os seus dados, posts, comentários e curtidas serão permanentemente removidos."
        type="error"
        showIcon
        style={{ marginBottom: "24px" }}
      />

      <Form form={form} layout="vertical" onFinish={handleDeleteAccount}>
        {/* Confirmation Text */}
        <Form.Item
          label={`Digite "EXCLUIR ${currentUser?.displayName?.toUpperCase()}" para confirmar`}
          name="confirmation"
          rules={[
            { required: true, message: "Confirmação obrigatória" },
            {
              validator: (_, value) => {
                if (
                  value !== `EXCLUIR ${currentUser?.displayName?.toUpperCase()}`
                ) {
                  return Promise.reject("Texto de confirmação incorreto");
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input
            placeholder={`Digite: EXCLUIR ${currentUser?.displayName?.toUpperCase()}`}
            size="large"
          />
        </Form.Item>

        {/* Password */}
        <Form.Item
          label="Digite sua senha para confirmar"
          name="password"
          rules={[{ required: true, message: "Senha é obrigatória" }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Sua senha atual"
            size="large"
          />
        </Form.Item>

        {/* Final Confirmation */}
        <Form.Item>
          <Checkbox
            checked={confirmDelete}
            onChange={(e) => setConfirmDelete(e.target.checked)}
          >
            <span style={{ color: "#ff4d4f", fontWeight: "600" }}>
              Eu entendo que esta ação é irreversível e quero excluir minha
              conta permanentemente
            </span>
          </Checkbox>
        </Form.Item>

        {/* What will be deleted */}
        <Alert
          message="O que será excluído:"
          description={
            <ul style={{ marginBottom: 0, paddingLeft: "20px" }}>
              <li>Perfil e informações pessoais</li>
              <li>Todos os posts e imagens</li>
              <li>Comentários e curtidas</li>
              <li>Conexões com amigos</li>
              <li>Histórico de atividades</li>
            </ul>
          }
          type="warning"
          style={{ marginBottom: "24px" }}
        />

        {/* Actions */}
        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onClose} size="large">
              Cancelar
            </Button>
            <Button
              type="primary"
              danger
              htmlType="submit"
              loading={loading}
              disabled={!confirmDelete}
              size="large"
              icon={<DeleteOutlined />}
            >
              EXCLUIR CONTA PERMANENTEMENTE
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
