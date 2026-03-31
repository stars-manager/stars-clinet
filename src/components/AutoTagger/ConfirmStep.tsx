import React from 'react';
import { Button, Space, Tag } from 'tdesign-react';
import { ConfirmStepProps } from './types';

export const ConfirmStep: React.FC<ConfirmStepProps> = ({
  pendingChanges,
  selectedChanges,
  onSelectionChange,
  onApply,
  onReselect,
  onCancel,
  isApplying,
}) => {
  return (
    <div style={{ padding: '12px 0' }}>
      {/* 工具栏 */}
      <div style={{
        marginBottom: '16px',
        padding: '12px',
        background: '#e8f5e9',
        borderRadius: '4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ color: '#2e7d32', fontWeight: 500 }}>
            已生成 {pendingChanges.length} 个项目的标签建议
          </span>
          <Space>
            <Button
              size="small"
              theme={selectedChanges.length === pendingChanges.length ? 'primary' : 'default'}
              variant={selectedChanges.length === pendingChanges.length ? 'base' : 'outline'}
              onClick={() => selectedChanges.length === pendingChanges.length ? onSelectionChange([]) : onSelectionChange(pendingChanges.map(c => c.repoFullName))}
            >
              {selectedChanges.length === pendingChanges.length ? '取消全选' : '全选'}
            </Button>
          </Space>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#666', fontSize: '14px' }}>已选择应用：</span>
          <span style={{ color: '#0052D9', fontWeight: 500, fontSize: '16px' }}>{selectedChanges.length}</span>
          <span style={{ color: '#999' }}> / {pendingChanges.length} 个项目</span>
        </div>
      </div>

      {/* 项目列表 - 可选择 */}
      <div style={{
        maxHeight: '400px',
        overflow: 'auto',
        border: '1px solid #e7e7e7',
        borderRadius: '4px',
        background: '#fff'
      }}>
        {pendingChanges.map(change => {
          const isSelected = selectedChanges.includes(change.repoFullName);
          return (
            <div
              key={change.repoFullName}
              onClick={() => {
                if (isSelected) {
                  onSelectionChange(selectedChanges.filter(id => id !== change.repoFullName));
                } else {
                  onSelectionChange([...selectedChanges, change.repoFullName]);
                }
              }}
              style={{
                padding: '12px',
                borderBottom: '1px solid #f0f0f0',
                cursor: 'pointer',
                background: isSelected ? '#e3f2fd' : '#fff',
                transition: 'background 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '3px',
                  border: `2px solid ${isSelected ? '#0052D9' : '#d9d9d9'}`,
                  background: isSelected ? '#0052D9' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <Tag size="small" theme="primary" variant="outline">
                  {change.repoFullName}
                </Tag>
                {change.language && (
                  <Tag size="small" theme="default" variant="light">
                    {change.language}
                  </Tag>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '24px', flexWrap: 'wrap' }}>
                <span style={{ color: '#999', fontSize: '12px' }}>→</span>
                {change.suggestedTags.map((tag, idx) => (
                  <Tag key={idx} size="small" theme="success" variant="light">
                    {tag}
                  </Tag>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部操作栏 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '16px'
      }}>
        <div style={{ fontSize: '12px', color: '#999' }}>
          点击项目可切换选中状态
        </div>
        <Space>
          <Button variant="outline" onClick={onReselect}>
            重新选择
          </Button>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button
            theme="primary"
            onClick={onApply}
            loading={isApplying}
            disabled={selectedChanges.length === 0}
          >
            应用选中标签 ({selectedChanges.length})
          </Button>
        </Space>
      </div>
    </div>
  );
};
