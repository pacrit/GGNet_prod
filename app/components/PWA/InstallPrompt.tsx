"use client";

import { useState } from 'react';
import { Button, Modal, Space, Typography } from 'antd';
import { DownloadOutlined, MobileOutlined } from '@ant-design/icons';
import { usePWA } from '../../hooks/usePWA';

const { Title, Text } = Typography;

export default function InstallPrompt() {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [showModal, setShowModal] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (isInstalled || !isInstallable) {
    return null;
  }

  const handleInstall = async () => {
    setInstalling(true);
    const success = await installApp();
    setInstalling(false);
    
    if (success) {
      setShowModal(false);
    }
  };

  return (
    <>
      <Button
        type="primary"
        icon={<DownloadOutlined />}
        onClick={() => setShowModal(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
          background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
          border: 'none',
          borderRadius: '50px',
          padding: '8px 16px',
          height: 'auto',
          boxShadow: '0 4px 12px rgba(0, 212, 255, 0.3)',
        }}
      >
        Instalar App
      </Button>

      <Modal
        title={
          <div style={{ textAlign: 'center' }}>
            <MobileOutlined style={{ fontSize: '24px', color: '#00d4ff', marginRight: '8px' }} />
            <Title level={4} style={{ margin: 0, display: 'inline' }}>
              Instalar GGNetworking
            </Title>
          </div>
        }
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={null}
        width={400}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Text style={{ fontSize: '16px', marginBottom: '24px', display: 'block' }}>
            Instale o GGNetworking como um app nativo para uma experiência ainda melhor!
          </Text>

          <div style={{ 
            background: '#f5f5f5', 
            borderRadius: '8px', 
            padding: '16px', 
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <Title level={5} style={{ margin: '0 0 8px 0' }}>Vantagens do App:</Title>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>🚀 Acesso mais rápido</li>
              <li>📱 Funciona offline</li>
              <li>🔔 Notificações push</li>
              <li>💾 Menos uso de dados</li>
              <li>🎮 Interface otimizada</li>
            </ul>
          </div>

          <Space>
            <Button onClick={() => setShowModal(false)}>
              Agora Não
            </Button>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />}
              onClick={handleInstall}
              loading={installing}
              style={{
                background: 'linear-gradient(135deg, #00d4ff, #0099cc)',
                border: 'none',
              }}
            >
              {installing ? 'Instalando...' : 'Instalar App'}
            </Button>
          </Space>
        </div>
      </Modal>
    </>
  );
}