"use client";
import { useState } from "react";
import { Modal, Form, Input, Select, DatePicker, TimePicker, Button, message } from "antd";
import { useAuth } from "../../contexts/AuthContext";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Option } = Select;

interface CreateSessionModalProps {
  squadId: number;
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const GAME_OPTIONS = [
  "Valorant", "CS2", "League of Legends", "Dota 2", "Apex Legends",
  "Fortnite", "Call of Duty", "Overwatch 2", "Rocket League", "FIFA",
  "Minecraft", "Among Us", "Fall Guys", "Outro"
];

const DURATION_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1h 30min" },
  { value: 120, label: "2 horas" },
  { value: 180, label: "3 horas" },
  { value: 240, label: "4 horas" },
];

const PARTICIPANTS_OPTIONS = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20];

export default function CreateSessionModal({ squadId, visible, onClose, onCreated }: CreateSessionModalProps) {
  const { token } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [customGame, setCustomGame] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);

    try {
      // Combinar data e hora
      const scheduledDateTime = dayjs(values.date)
        .hour(values.time.hour())
        .minute(values.time.minute())
        .toDate();

      if (scheduledDateTime <= new Date()) {
        message.error("Data e hora devem ser no futuro");
        setLoading(false);
        return;
      }

      const gameNameToUse = values.gameName === "Outro" ? values.customGame : values.gameName;

      const response = await fetch(`/api/squads/${squadId}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: values.title,
          description: values.description,
          gameName: gameNameToUse,
          scheduledDate: scheduledDateTime.toISOString(),
          duration: values.duration,
          maxParticipants: values.maxParticipants,
        }),
      });

      const data = await response.json();

      if (data.success) {
        message.success("Sessão criada com sucesso!");
        form.resetFields();
        onCreated();
      } else {
        message.error(data.error || "Erro ao criar sessão");
      }
    } catch (error) {
      console.error("Erro ao criar sessão:", error);
      message.error("Erro ao criar sessão");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setCustomGame(false);
    onClose();
  };

  return (
    <Modal
      title="🎮 Nova Sessão de Jogo"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnClose
      styles={{
        body: {
          maxHeight: '70vh',
          overflow: 'auto',
        },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          duration: 60,
          maxParticipants: 5,
        }}
      >
        <Form.Item
          label="Título da Sessão"
          name="title"
          rules={[{ required: true, message: 'Por favor, insira o título!' }]}
        >
          <Input 
            placeholder="Ex: Ranked Valorant - Push para Imortal"
            maxLength={200}
          />
        </Form.Item>

        <Form.Item
          label="Descrição"
          name="description"
        >
          <TextArea 
            placeholder="Detalhes sobre a sessão, estratégias, requisitos..."
            rows={3}
            maxLength={500}
          />
        </Form.Item>

        <div style={{ display: 'flex', gap: '16px' }}>
          <Form.Item
            label="Jogo"
            name="gameName"
            rules={[{ required: true, message: 'Por favor, selecione o jogo!' }]}
            style={{ flex: 1 }}
          >
            <Select 
              placeholder="Selecione o jogo"
              onChange={(value) => setCustomGame(value === "Outro")}
            >
              {GAME_OPTIONS.map(game => (
                <Option key={game} value={game}>{game}</Option>
              ))}
            </Select>
          </Form.Item>

          {customGame && (
            <Form.Item
              label="Nome do Jogo"
              name="customGame"
              rules={[{ required: true, message: 'Por favor, insira o nome do jogo!' }]}
              style={{ flex: 1 }}
            >
              <Input 
                placeholder="Digite o nome do jogo"
                maxLength={100}
              />
            </Form.Item>
          )}
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <Form.Item
            label="Data"
            name="date"
            rules={[{ required: true, message: 'Por favor, selecione a data!' }]}
            style={{ flex: 1 }}
          >
            <DatePicker 
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          <Form.Item
            label="Hora"
            name="time"
            rules={[{ required: true, message: 'Por favor, selecione a hora!' }]}
            style={{ flex: 1 }}
          >
            <TimePicker 
              style={{ width: '100%' }}
              format="HH:mm"
            />
          </Form.Item>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <Form.Item
            label="Duração"
            name="duration"
            style={{ flex: 1 }}
          >
            <Select>
              {DURATION_OPTIONS.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Max. Participantes"
            name="maxParticipants"
            style={{ flex: 1 }}
          >
            <Select>
              {PARTICIPANTS_OPTIONS.map(num => (
                <Option key={num} value={num}>{num} pessoas</Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button onClick={handleCancel}>
              Cancelar
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              style={{
                background: 'linear-gradient(45deg, #00d4ff, #0099cc)',
                border: 'none',
              }}
            >
              {loading ? "Criando..." : "Criar Sessão"}
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}