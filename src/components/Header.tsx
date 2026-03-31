import React, { useState, useEffect } from 'react';
import { Button, Space, Dialog, Tag, MessagePlugin, Dropdown, Popup, DropdownOption } from 'tdesign-react';
import { useAppStore } from '../stores/app';
import { SyncSettings } from './SyncSettings';
import { AutoTagger } from './AutoTagger';
import { calculateIncrementalChanges, formatChangeSummary, IncrementalStats } from '../utils/incrementalChanges';
import { getLoginURL } from '../api/auth';

interface HeaderProps {
  onOpenLabelManager: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenLabelManager }) => {
  const store = useAppStore();
  const {
    isAuthenticated,
    user,
    fetchStars,
    loadingStars,
    syncToRepo,
    syncing,
    syncRepo,
    stars,
    lastSyncTime,
    checkAuth,
    logout,
  } = store;

  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [showPushConfirm, setShowPushConfirm] = useState(false);
  const [showAutoTagger, setShowAutoTagger] = useState(false);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [showLoginConfirm, setShowLoginConfirm] = useState(false);
  const [incrementalStats, setIncrementalStats] = useState<IncrementalStats | null>(null);

  // 初始化时检查认证状态
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 设置下拉菜单选项
  const settingsOptions = isAuthenticated
    ? [
        { content: '标签设置', value: 'labels' },
        { content: '同步设置', value: 'sync' },
        { content: '登出', value: 'logout' },
      ]
    : [];

  // 登录处理
  const handleLogin = async () => {
    try {
      const response = await getLoginURL();
      window.location.href = response.auth_url;
    } catch {
      MessagePlugin.error('获取登录地址失败');
    }
  };

  // 登出处理
  const handleLogout = async () => {
    try {
      await logout();
      MessagePlugin.success('已登出');
    } catch {
      MessagePlugin.error('登出失败');
    }
  };

  // 同步 Stars - 预处理检查
  const handleSyncStars = () => {
    if (!isAuthenticated) {
      MessagePlugin.warning('请先登录');
      setShowLoginConfirm(true);
      return;
    }
    if (!user?.login) {
      MessagePlugin.warning('用户信息加载失败，请重新登录');
      return;
    }
    if (!syncRepo) {
      MessagePlugin.warning('请先配置同步仓库');
      setShowSyncSettings(true);
      return;
    }
    // 显示确认弹窗
    setShowSyncConfirm(true);
  };

  // 确认同步 Stars
  const handleConfirmSync = async () => {
    setShowSyncConfirm(false);
    try {
      const stats = await fetchStars();
      if (stats) {
        // 显示合并统计信息
        const { added, updated, unchanged, preserved } = stats;
        const parts: string[] = [];
        
        if (added > 0) parts.push(`新增 ${added} 个`);
        if (updated > 0) parts.push(`更新 ${updated} 个`);
        if (unchanged > 0) parts.push(`${unchanged} 个未变化`);
        
        let message = 'Stars 同步成功';
        if (parts.length > 0) {
          message += `：${parts.join('、')}`;
        }
        
        MessagePlugin.success(message);
        
        // 如果有保留的数据，显示额外提示
        if (preserved > 0) {
          setTimeout(() => {
            MessagePlugin.info(`保留了 ${preserved} 个已 unstar 仓库的标签数据`);
          }, 1000);
        }
      } else {
        MessagePlugin.success('Stars 同步成功');
      }
    } catch (error) {
      const err = error as Error;
      MessagePlugin.error(err.message || 'Stars 同步失败');
    }
  };

  // 推送到仓库 - 打开确认弹窗
  const handlePushToRepo = async () => {
    if (!isAuthenticated) {
      MessagePlugin.warning('请先登录');
      setShowLoginConfirm(true);
      return;
    }
    
    if (!syncRepo) {
      MessagePlugin.warning('请先配置同步仓库');
      setShowSyncSettings(true);
      return;
    }

    // 检查是否有 Stars 数据
    if (store.stars.length === 0) {
      MessagePlugin.warning('暂无 Stars 数据，请先同步 Stars');
      return;
    }
    
    // 计算增量信息
    try {
      // 从仓库读取当前数据
      const { getFileContent } = await import('../api/github-proxy');
      const { parseSyncData } = await import('../utils/dataMerge');
      const [owner, repo] = syncRepo.split('/');
      
      let remoteRepos = {};
      const fileData = await getFileContent(owner, repo, 'stars.json');
      
      if (fileData) {
        const syncData = parseSyncData(fileData.content);
        if (syncData?.repos) {
          remoteRepos = syncData.repos;
        }
      }
      
      // 计算增量
      const stats = calculateIncrementalChanges(store.repos, remoteRepos);
      setIncrementalStats(stats);
      setShowPushConfirm(true);
    } catch (error) {
      console.error('Failed to calculate incremental changes:', error);
      // 如果失败，仍然打开弹窗但不显示增量信息
      setIncrementalStats(null);
      setShowPushConfirm(true);
    }
  };

  // 确认推送
  const handleConfirmPush = async () => {
    try {
      await syncToRepo();
      MessagePlugin.success('数据已推送到仓库');
      setShowPushConfirm(false);
    } catch (error) {
      const err = error as Error;
      MessagePlugin.error(err.message || '推送失败');
    }
  };

  // 处理设置菜单点击
  const handleSettingsClick = (dropdownItem: DropdownOption) => {
    const value = dropdownItem.value as string;
    switch (value) {
      case 'labels':
        onOpenLabelManager();
        break;
      case 'sync':
        setShowSyncSettings(true);
        break;
      case 'logout':
        handleLogout();
        break;
    }
  };

  return (
    <header style={{
      padding: '12px 24px',
      background: '#fff',
      borderBottom: '1px solid #e7e7e7',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* 左侧：Logo + 用户信息 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0052cc' }}>
          ⭐ GitHub Star Manager
        </h1>
        {isAuthenticated && user && (
          <Space size="small">
            <img src={user.avatar_url} alt={user.login} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
            <span style={{ fontSize: '14px', color: '#666' }}>{user.login}</span>
          </Space>
        )}
      </div>

      {/* 右侧：主要操作 */}
      <Space size="small">
        {/* 最后同步时间 */}
        {lastSyncTime > 0 && (
          <Popup content="最后同步时间" placement="bottom">
            <span style={{ 
              fontSize: '12px', 
              color: '#8c8c8c',
              padding: '4px 8px',
              background: '#f5f5f5',
              borderRadius: '4px',
            }}>
              {new Date(lastSyncTime).toLocaleString('zh-CN', { 
                month: 'numeric', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </Popup>
        )}
        
        {/* 登录/操作按钮 */}
        {!isAuthenticated ? (
          <Button 
            theme="primary" 
            onClick={() => setShowLoginConfirm(true)}
            title="使用 GitHub 账号登录"
          >
            GitHub 登录
          </Button>
        ) : (
          <>
            <Button onClick={handleSyncStars} loading={loadingStars} title="从 GitHub 拉取最新的 Stars 列表">
              同步 Stars
            </Button>
            <Button 
              theme="primary"
              onClick={() => setShowAutoTagger(true)} 
              title="使用 AI 自动为项目生成标签"
              disabled={stars.length === 0}
            >
              自动标签
            </Button>
            {syncRepo && (
              <Button onClick={handlePushToRepo} loading={syncing} title="将 Stars 数据推送到选定的仓库">
                推送
              </Button>
            )}

            {/* 设置下拉菜单 */}
            <Dropdown 
              options={settingsOptions} 
              onClick={handleSettingsClick}
              placement="bottom-right"
            >
              <Button variant="outline" icon={<span>⚙️</span>}>
                设置
              </Button>
            </Dropdown>
          </>
        )}
      </Space>

      {/* 登录确认弹窗 */}
      <Dialog
        header="GitHub 登录"
        visible={showLoginConfirm}
        onConfirm={handleLogin}
        onClose={() => setShowLoginConfirm(false)}
        confirmBtn={{ content: '前往 GitHub 授权', theme: 'primary' }}
        cancelBtn="取消"
      >
        <div style={{ padding: '12px 0' }}>
          <p style={{ marginBottom: '12px', color: '#666' }}>
            即将跳转到 GitHub 进行 OAuth 授权登录
          </p>
          <p style={{ fontSize: '12px', color: '#999' }}>
            授权后，您可以使用 GitHub Stars 管理功能
          </p>
        </div>
      </Dialog>

      {/* 同步设置弹窗 */}
      <SyncSettings
        visible={showSyncSettings}
        onClose={() => setShowSyncSettings(false)}
      />

      {/* 自动标签弹窗 */}
      <AutoTagger
        visible={showAutoTagger}
        onClose={() => setShowAutoTagger(false)}
      />

      {/* 推送确认弹窗 */}
      <Dialog
        header="推送到仓库"
        visible={showPushConfirm}
        onConfirm={handleConfirmPush}
        onClose={() => setShowPushConfirm(false)}
        confirmBtn={{ 
          content: '确认推送', 
          loading: syncing, 
          theme: 'primary',
        }}
        cancelBtn="取消"
        width="600px"
      >
        <div style={{ padding: '12px 0' }}>
          {/* 当前同步仓库 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>
                当前同步仓库
              </span>
              <Button 
                size="small"
                variant="outline"
                onClick={() => {
                  setShowPushConfirm(false);
                  setShowSyncSettings(true);
                }}
              >
                设置仓库
              </Button>
            </div>
            <div style={{ 
              padding: '12px', 
              background: '#f5f5f5', 
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '14px', color: '#666' }}>{syncRepo}</span>
              <a
                href={`https://github.com/${syncRepo}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '12px', color: '#0052cc' }}
              >
                查看仓库
              </a>
            </div>
          </div>

          {/* 增量信息 */}
          {incrementalStats && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '12px' }}>
                待推送的更改
              </div>
              
              {/* 统计摘要 */}
              <div style={{ 
                padding: '12px', 
                background: '#e8f5e9', 
                borderRadius: '4px',
                marginBottom: '12px'
              }}>
                {formatChangeSummary(incrementalStats).map((msg, idx) => (
                  <div key={idx} style={{ fontSize: '14px', color: '#2e7d32', marginBottom: idx < formatChangeSummary(incrementalStats).length - 1 ? '4px' : 0 }}>
                    • {msg}
                  </div>
                ))}
                {formatChangeSummary(incrementalStats).length === 0 && (
                  <div style={{ fontSize: '14px', color: '#999' }}>
                    暂无变更
                  </div>
                )}
              </div>

              {/* 详细变更列表 */}
              {(incrementalStats.labelChanges.length > 0 || incrementalStats.remarkChanges.length > 0) && (
                <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                  {/* 标签变更 */}
                  {incrementalStats.labelChanges.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#333', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🏷️ 标签变更</span>
                        <Tag theme="primary" variant="light" size="small">{incrementalStats.labelChanges.length}</Tag>
                      </div>
                      {incrementalStats.labelChanges.slice(0, 20).map((change, idx) => {
                        const oldLabelIds = Array.isArray(change.oldValue) ? change.oldValue : [];
                        const newLabelIds = Array.isArray(change.newValue) ? change.newValue : [];
                        
                        return (
                          <div 
                            key={idx} 
                            style={{ 
                              padding: '8px 10px', 
                              background: '#fafafa', 
                              borderRadius: '4px',
                              marginBottom: '6px',
                              fontSize: '12px'
                            }}
                          >
                            <div style={{ 
                              fontWeight: 500, 
                              color: '#333', 
                              marginBottom: '6px',
                              fontSize: '13px'
                            }}>
                              {change.repoFullName}
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              {/* 旧标签 */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', flex: 1 }}>
                                {oldLabelIds.length === 0 ? (
                                  <span style={{ color: '#bfbfbf', fontStyle: 'italic' }}>无标签</span>
                                ) : (
                                  oldLabelIds.map(id => {
                                    const label = store.labels.find(l => l.id === id);
                                    if (!label) return null;
                                    return (
                                      <Tag
                                        key={id}
                                        size="small"
                                        style={{
                                          backgroundColor: '#f5f5f5',
                                          color: '#8c8c8c',
                                          textDecoration: 'line-through',
                                          border: '1px solid #d9d9d9',
                                        }}
                                      >
                                        {label.name}
                                      </Tag>
                                    );
                                  })
                                )}
                              </div>
                              
                              {/* 箭头 */}
                              <span style={{ color: '#999', fontSize: '14px' }}>→</span>
                              
                              {/* 新标签 */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', flex: 1 }}>
                                {newLabelIds.length === 0 ? (
                                  <span style={{ color: '#bfbfbf', fontStyle: 'italic' }}>无标签</span>
                                ) : (
                                  newLabelIds.map(id => {
                                    const label = store.labels.find(l => l.id === id);
                                    if (!label) return null;
                                    return (
                                      <Tag
                                        key={id}
                                        size="small"
                                        style={{
                                          backgroundColor: label.color,
                                          color: '#fff',
                                          border: 'none',
                                        }}
                                      >
                                        {label.name}
                                      </Tag>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {incrementalStats.labelChanges.length > 20 && (
                        <div style={{ fontSize: '12px', color: '#999', textAlign: 'center', padding: '6px', background: '#fafafa', borderRadius: '4px' }}>
                          还有 {incrementalStats.labelChanges.length - 20} 个标签变更...
                        </div>
                      )}
                    </div>
                  )}

                  {/* 备注变更 */}
                  {incrementalStats.remarkChanges.length > 0 && (
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#333', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📝 备注变更</span>
                        <Tag theme="primary" variant="light" size="small">{incrementalStats.remarkChanges.length}</Tag>
                      </div>
                      {incrementalStats.remarkChanges.slice(0, 20).map((change, idx) => {
                        const oldRemark = typeof change.oldValue === 'string' ? change.oldValue : '';
                        const newRemark = typeof change.newValue === 'string' ? change.newValue : '';
                        
                        return (
                          <div 
                            key={idx} 
                            style={{ 
                              padding: '8px 10px', 
                              background: '#fafafa', 
                              borderRadius: '4px',
                              marginBottom: '6px',
                              fontSize: '12px'
                            }}
                          >
                            <div style={{ 
                              fontWeight: 500, 
                              color: '#333', 
                              marginBottom: '6px',
                              fontSize: '13px'
                            }}>
                              {change.repoFullName}
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {/* 旧备注 */}
                              <div style={{ 
                                flex: 1,
                                color: oldRemark ? '#8c8c8c' : '#bfbfbf',
                                textDecoration: oldRemark ? 'line-through' : 'none',
                                fontStyle: oldRemark ? 'normal' : 'italic',
                                fontSize: '12px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {oldRemark || '无备注'}
                              </div>
                              
                              {/* 箭头 */}
                              <span style={{ color: '#999', fontSize: '14px' }}>→</span>
                              
                              {/* 新备注 */}
                              <div style={{ 
                                flex: 1,
                                color: newRemark ? '#52c41a' : '#bfbfbf',
                                fontStyle: newRemark ? 'normal' : 'italic',
                                fontSize: '12px',
                                fontWeight: newRemark ? 500 : 400,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {newRemark || '无备注'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {incrementalStats.remarkChanges.length > 20 && (
                        <div style={{ fontSize: '12px', color: '#999', textAlign: 'center', padding: '6px', background: '#fafafa', borderRadius: '4px' }}>
                          还有 {incrementalStats.remarkChanges.length - 20} 个备注变更...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 提示信息 */}
          <p style={{ fontSize: '12px', color: '#999' }}>
            推送将更新仓库中的 stars.json 和 README.md 文件。
          </p>
        </div>
      </Dialog>

      {/* 同步 Stars 确认弹窗 */}
      <Dialog
        header="确认同步 Stars"
        visible={showSyncConfirm}
        onConfirm={handleConfirmSync}
        onClose={() => setShowSyncConfirm(false)}
        confirmBtn={{ 
          content: '确认同步', 
          loading: loadingStars, 
          theme: 'primary',
        }}
        cancelBtn="取消"
        width="500px"
      >
        <div style={{ padding: '12px 0' }}>
          <div style={{ 
            padding: '12px', 
            background: '#fff7e6', 
            border: '1px solid #ffd591',
            borderRadius: '4px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '14px', color: '#d46b08', fontWeight: 500, marginBottom: '8px' }}>
              ⚠️ 同步会覆盖本地数据
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#874300', lineHeight: 1.8 }}>
              <li>将从 GitHub 拉取最新的 Stars 列表</li>
              <li>将从同步仓库读取已有的标签和备注数据</li>
              <li>新数据会与本地数据合并，<strong>本地未保存的更改将被覆盖</strong></li>
              <li>如需保留本地更改，请先点击"推送到仓库"保存数据</li>
            </ul>
          </div>
          <p style={{ fontSize: '12px', color: '#8c8c8c' }}>
            同步拉取仓库：<strong>{syncRepo}</strong>
          </p>
        </div>
      </Dialog>
    </header>
  );
};
