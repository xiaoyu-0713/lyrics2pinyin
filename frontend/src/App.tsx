import React, { useState } from 'react';
import { Tabs, Layout, Typography } from 'antd';
import SingleRunTab from './components/SingleRunTab';
import BatchRunTab from './components/BatchRunTab';
import ConfigTab from './components/ConfigTab';

const { Header, Content } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  const [globalConfig, setGlobalConfig] = useState<Record<string, Record<string, string>>>({});

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', background: '#fff' }}>
        <Title level={3} style={{ margin: 0 }}>中文歌词多音字处理系统</Title>
      </Header>
      <Content style={{ padding: '24px 50px' }}>
        <div style={{ background: '#fff', padding: 24, minHeight: 280, borderRadius: 8 }}>
          <Tabs
            defaultActiveKey="1"
            items={[
              {
                label: '单个运行',
                key: '1',
                children: <SingleRunTab globalConfig={globalConfig} />,
              },
              {
                label: '批量运行',
                key: '2',
                children: <BatchRunTab globalConfig={globalConfig} />,
              },
              {
                label: '多音字库配置',
                key: '3',
                children: <ConfigTab globalConfig={globalConfig} setGlobalConfig={setGlobalConfig} />,
              }
            ]}
          />
        </div>
      </Content>
    </Layout>
  );
};

export default App;
