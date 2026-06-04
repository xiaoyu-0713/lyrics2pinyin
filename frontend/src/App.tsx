import React, { useState } from 'react';
import { Tabs, Layout, Typography, ConfigProvider, theme } from 'antd';
import { SoundOutlined, UnorderedListOutlined, SettingOutlined, FileSearchOutlined } from '@ant-design/icons';
import SingleRunTab from './components/SingleRunTab';
import BatchRunTab from './components/BatchRunTab';
import ConfigTab from './components/ConfigTab';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

const App: React.FC = () => {
  const [globalConfig, setGlobalConfig] = useState<Record<string, Record<string, string>>>({
    的: { __ignoreAll: true } as any,
    大: { __ignoreAll: true } as any,
  });

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#3b82f6',
          colorInfo: '#3b82f6',
          borderRadius: 10,
          fontFamily: 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
        },
        algorithm: theme.defaultAlgorithm,
      }}
    >
      <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 48px',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%)',
            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.25)',
            height: 72,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(8px)',
              }}
            >
              <SoundOutlined style={{ fontSize: 22, color: '#fff' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Title level={4} style={{ margin: 0, color: '#fff', lineHeight: 1.2 }}>
                中文歌词多音字处理系统
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                Lyrics Polyphone Processing System
              </Text>
            </div>
          </div>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
            智能识别 · 精准替换 · 批量处理
          </Text>
        </Header>

        <Content style={{ padding: '32px 48px' }}>
          <div
            style={{
              background: '#fff',
              padding: '8px 24px 24px',
              minHeight: 280,
              borderRadius: 16,
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
              border: '1px solid #f0f0f0',
            }}
          >
            <Tabs
              defaultActiveKey="1"
              size="large"
              tabBarStyle={{ marginBottom: 24 }}
              items={[
                {
                  label: (
                    <span>
                      <FileSearchOutlined /> 单个运行
                    </span>
                  ),
                  key: '1',
                  children: <SingleRunTab globalConfig={globalConfig as unknown as Record<string, Record<string, { replacement: string; ignore: boolean; }>>} />,
                },
                {
                  label: (
                    <span>
                      <UnorderedListOutlined /> 批量运行
                    </span>
                  ),
                  key: '2',
                  children: <BatchRunTab globalConfig={globalConfig as unknown as Record<string, Record<string, { replacement: string; ignore: boolean; }>>} />,
                },
                {
                  label: (
                    <span>
                      <SettingOutlined /> 多音字库配置
                    </span>
                  ),
                  key: '3',
                  children: <ConfigTab globalConfig={globalConfig} setGlobalConfig={setGlobalConfig} />,
                },
              ]}
            />
          </div>
        </Content>

        <Footer style={{ textAlign: 'center', background: 'transparent', color: '#8b8b8b' }}>
          中文歌词多音字处理系统 © {new Date().getFullYear()} · Powered by React + Ant Design
        </Footer>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
