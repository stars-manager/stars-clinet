import React, { useState, useEffect, useRef } from 'react';
import { Layout, Button, Space, MessagePlugin } from 'tdesign-react';
import { useAppStore } from './stores/app';
import { Header } from './components/Header';
import { StarList } from './components/StarList';
import { LabelManager } from './components/LabelManager';
import { ErrorBoundary } from './components/ErrorBoundary';

const { Content } = Layout;

const MainContent: React.FC = () => {
  const { showFetchStarsModal, setShowFetchStarsModal, fetchStars } = useAppStore();
  const [showLabelManager, setShowLabelManager] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header onOpenLabelManager={() => setShowLabelManager(true)} />

      {/* 拉取 Stars 弹窗 */}
      {showFetchStarsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '32px',
            width: '420px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⭐</div>
              <h3 style={{ marginBottom: '12px', fontSize: '20px', color: '#333' }}>拉取最新 Stars</h3>
              <p style={{ marginBottom: '8px', color: '#666', lineHeight: 1.6 }}>
                是否从 GitHub 拉取最新的 Stars 列表？
              </p>
              <p style={{ fontSize: '13px', color: '#999', lineHeight: 1.5 }}>
                点击「拉取」将从 GitHub 获取最新数据<br />
                点击「忽略」将使用本地缓存
              </p>
            </div>
            <Space>
              <Button 
                theme="primary"
                onClick={async () => {
                  await fetchStars();
                  setShowFetchStarsModal(false);
                  MessagePlugin.success('Stars 拉取成功');
                }}
                style={{ minWidth: '120px' }}
              >
                拉取
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowFetchStarsModal(false)}
                style={{ minWidth: '120px' }}
              >
                忽略
              </Button>
            </Space>
          </div>
        </div>
      )}

      <Content style={{ padding: '24px', background: '#f5f5f5' }}>
        <ErrorBoundary>
          <StarList />
        </ErrorBoundary>
      </Content>

      {/* 标签管理弹窗 */}
      {showLabelManager && (
        <LabelManager onClose={() => setShowLabelManager(false)} />
      )}
    </Layout>
  );
};

const App: React.FC = () => {
  const { checkAuth, isAuthenticated } = useAppStore();
  const [checking, setChecking] = useState(true);
  const hasShownWelcome = useRef(false);

  // 应用启动时检查认证状态
  useEffect(() => {
    const initAuth = async () => {
      try {
        await checkAuth();
      } catch {
        // 未登录或认证失败，静默处理
      } finally {
        setChecking(false);
      }
    };

    initAuth();
  }, [checkAuth]);

  // 显示欢迎提示（未登录时）
  useEffect(() => {
    if (!checking && !isAuthenticated && !hasShownWelcome.current) {
      hasShownWelcome.current = true;
      setTimeout(() => {
        MessagePlugin.info({
          content: '欢迎使用 GitHub Star Manager！请先登录 GitHub 开始使用',
          duration: 5000,
        });
      }, 500);
    }
  }, [checking, isAuthenticated]);

  if (checking) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '16px',
        color: '#666'
      }}>
        正在检查登录状态...
      </div>
    );
  }

  return <MainContent />;
};

export default App;
