import React, { useState, memo, useMemo } from 'react';
import { Tag, Space, Button } from 'tdesign-react';
import { GitHubRepo, Label } from '../types';
import { useAppStore } from '../stores/app';
import { LabelSelector } from './LabelSelector';

interface StarCardProps {
  repo: GitHubRepo;
}

// 使用 React.memo 优化性能，只在 repo 变化时重新渲染
export const StarCard: React.FC<StarCardProps> = memo(({ repo }) => {
  const { labels, getRepoLabels, getRepoRemark } = useAppStore();
  const [showLabelSelector, setShowLabelSelector] = useState(false);

  const repoLabelIds = getRepoLabels(repo.full_name);
  const repoLabels = useMemo(() => 
    repoLabelIds.map(id => labels.find(l => l.id === id)).filter(Boolean) as Label[],
    [repoLabelIds, labels]
  );
  const remark = getRepoRemark(repo.full_name);

  // 使用 useMemo 缓存格式化函数的结果
  const formattedDate = useMemo(() => {
    const date = new Date(repo.updated_at);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff < 7) return `${diff}天前`;
    if (diff < 30) return `${Math.floor(diff / 7)}周前`;
    if (diff < 365) return `${Math.floor(diff / 30)}月前`;
    return `${Math.floor(diff / 365)}年前`;
  }, [repo.updated_at]);

  const formattedStars = useMemo(() => {
    if (repo.stargazers_count >= 1000) {
      return `${(repo.stargazers_count / 1000).toFixed(1)}k`;
    }
    return repo.stargazers_count.toString();
  }, [repo.stargazers_count]);

  return (
    <>
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '12px',
          cursor: 'pointer',
          transition: 'box-shadow 0.2s',
        }}
        onClick={() => window.open(repo.html_url, '_blank')}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <img
                src={repo.owner.avatar_url}
                alt={repo.owner.login}
                style={{ width: '20px', height: '20px', borderRadius: '50%', marginRight: '8px' }}
              />
              <span style={{ fontWeight: 600, color: '#0052cc' }}>{repo.full_name}</span>
            </div>

            <p style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
              {repo.description || '暂无描述'}
            </p>

            <Space size="small">
              <span>⭐ {formattedStars}</span>
              {repo.language && <span>● {repo.language}</span>}
              <span>📅 {formattedDate}</span>
            </Space>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <Button
              size="small"
              variant="outline"
              onClick={() => setShowLabelSelector(true)}
              title="为该项目添加或管理标签"
            >
              {repoLabels.length > 0 ? `${repoLabels.length} 个标签` : '添加标签'}
            </Button>
          </div>
        </div>

        {(repoLabels.length > 0 || remark) && (
          <div style={{ marginTop: '12px' }}>
            {remark && (
              <div style={{ 
                fontSize: '12px', 
                color: '#666', 
                backgroundColor: '#f5f5f5',
                padding: '4px 8px',
                borderRadius: '4px',
                marginBottom: '8px',
              }}>
                {'> ' + remark}
              </div>
            )}
            {repoLabels.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {repoLabels.map(label => (
                  <Tag
                    key={label.id}
                    style={{
                      backgroundColor: label.color,
                      color: '#fff',
                      border: 'none',
                    }}
                  >
                    {label.type === 'generated' && '✨ '}{label.name}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showLabelSelector && (
        <LabelSelector
          repoFullName={repo.full_name}
          onClose={() => setShowLabelSelector(false)}
        />
      )}
    </>
  );
});
