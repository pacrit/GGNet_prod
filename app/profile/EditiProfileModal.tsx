"use client";

import { useState } from "react";
import {
  Modal,
  Form,
  Input,
  Upload,
  Button,
  message,
  Avatar,
  Space,
  Divider,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  UploadOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  onProfileUpdated: () => void;
}

export default function EditProfileModal({
  open,
  onClose,
  onProfileUpdated,
}: EditProfileModalProps) {
  const { currentUser, token, updateUser } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState(
    currentUser?.avatarUrl || ""
  );

  // 🔧 Função para upload direto no Cloudinary
  async function uploadToCloudinary(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "preset_publico"); // Preset público no Cloudinary

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    if (!res.ok) {
      throw new Error("Erro no upload para Cloudinary");
    }

    const data = await res.json();
    return data.secure_url;
  }

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);

    try {
      // 🔧 Usar upload direto para Cloudinary
      const avatarUrl = await uploadToCloudinary(file);
      setNewAvatarUrl(avatarUrl);
      message.success("Avatar enviado com sucesso!");
    } catch (error) {
      console.error("Erro no upload:", error);
      message.error("Erro ao enviar avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);

    try {
      const updateData: any = {
        display_name: values.displayName,
        avatar_url: newAvatarUrl,
      };

      // Só incluir senha se foi preenchida
      if (values.newPassword) {
        if (values.newPassword !== values.confirmPassword) {
          message.error("As senhas não coincidem");
          setLoading(false);
          return;
        }
        updateData.current_password = values.currentPassword;
        updateData.new_password = values.newPassword;
      }

      // 🔧 Atualizar URL para /api/users
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok) {
        message.success("Perfil atualizado com sucesso!");
        updateUser(data.user);
        onProfileUpdated();
        onClose();
        form.resetFields();
        setNewAvatarUrl("");
      } else {
        message.error(data.error || "Erro ao atualizar perfil");
      }
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      message.error("Erro ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  const uploadProps = {
    beforeUpload: (file: File) => {
      // Validar tipo de arquivo
      const isImage = file.type.startsWith("image/");
      if (!isImage) {
        message.error("Você só pode enviar arquivos de imagem!");
        return false;
      }

      // Validar tamanho (máximo 2MB)
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error("A imagem deve ter menos de 2MB!");
        return false;
      }

      // Validar se o Cloudinary está configurado
      if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
        message.error("Cloudinary não configurado");
        return false;
      }

      // Fazer upload
      handleAvatarUpload(file);
      return false; // Previne upload automático do Ant Design
    },
    showUploadList: false,
  };

  // 🔧 Reset avatar URL quando modal abrir
  const handleModalCancel = () => {
    onClose();
    form.resetFields();
    setNewAvatarUrl(currentUser?.avatarUrl || "");
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <EditOutlined />
          <span>Editar Perfil</span>
        </div>
      }
      open={open}
      onCancel={handleModalCancel}
      footer={null}
      width={500}
      style={{ top: 20 }}
      afterClose={() => {
        // Reset quando modal fechar completamente
        setNewAvatarUrl(currentUser?.avatarUrl || "");
        form.resetFields();
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          displayName: currentUser?.displayName,
        }}
      >
        {/* Avatar Section */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "24px",
            padding: "20px",
            background: "#f5f5f5",
            borderRadius: "8px",
          }}
        >
          <Avatar
            size={80}
            src={newAvatarUrl || currentUser?.avatarUrl}
            icon={<UserOutlined />}
            style={{ marginBottom: "16px" }}
          />
          <br />
          <Upload {...uploadProps}>
            <Button
              icon={<UploadOutlined />}
              loading={uploadingAvatar}
              type="primary"
              ghost
              disabled={!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}
            >
              {uploadingAvatar ? "Enviando..." : "Alterar Avatar"}
            </Button>
          </Upload>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
            {process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
              ? "Formatos: JPG, PNG, GIF | Máximo: 2MB"
              : "Cloudinary não configurado"}
          </div>

          {/* 🆕 Preview da URL atual */}
          {newAvatarUrl && newAvatarUrl !== currentUser?.avatarUrl && (
            <div
              style={{
                fontSize: "11px",
                color: "#52c41a",
                marginTop: "4px",
                wordBreak: "break-all",
              }}
            >
              ✅ Novo avatar carregado
            </div>
          )}
        </div>

        {/* Display Name */}
        <Form.Item
          label="Nome de Exibição"
          name="displayName"
          rules={[
            { required: true, message: "Nome é obrigatório" },
            { min: 2, message: "Nome deve ter pelo menos 2 caracteres" },
            { max: 50, message: "Nome deve ter no máximo 50 caracteres" },
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="Seu nome de exibição"
            size="large"
          />
        </Form.Item>

        <Divider>Alterar Senha (Opcional)</Divider>

        {/* Current Password */}
        <Form.Item
          label="Senha Atual"
          name="currentPassword"
          dependencies={["newPassword"]}
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (getFieldValue("newPassword") && !value) {
                  return Promise.reject("Digite sua senha atual");
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Digite sua senha atual"
            size="large"
          />
        </Form.Item>

        {/* New Password */}
        <Form.Item
          label="Nova Senha"
          name="newPassword"
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (value && value.length < 6) {
                  return Promise.reject(
                    "Nova senha deve ter pelo menos 6 caracteres"
                  );
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Digite uma nova senha (opcional)"
            size="large"
          />
        </Form.Item>

        {/* Confirm Password */}
        <Form.Item
          label="Confirmar Nova Senha"
          name="confirmPassword"
          dependencies={["newPassword"]}
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (getFieldValue("newPassword") && !value) {
                  return Promise.reject("Confirme sua nova senha");
                }
                if (getFieldValue("newPassword") !== value) {
                  return Promise.reject("As senhas não coincidem");
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Confirme sua nova senha"
            size="large"
          />
        </Form.Item>

        {/* Actions */}
        <Form.Item style={{ marginBottom: 0, marginTop: "24px" }}>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={handleModalCancel}>Cancelar</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
            >
              Salvar Alterações
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
