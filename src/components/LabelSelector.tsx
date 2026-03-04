import React, { useState } from 'react';
import Button from 'tdesign-react/es/button';
import Tag from 'tdesign-react/es/tag';
import Input from 'tdesign-react/es/input';
import Textarea from 'tdesign-react/es/textarea';
import Dialog from 'tdesign-react/es/dialog';
import Space from 'tdesign-react/es/space';
import { MessagePlugin } from 'tdesign-react/es/message';
import 'tdesign-react/es/button/style/css.js';
import 'tdesign-react/es/tag/style/css.js';
import 'tdesign-react/es/input/style/css.js';
import 'tdesign-react/es/textarea/style/css.js';
import 'tdesign-react/es/dialog/style/css.js';
import 'tdesign-react/es/space/style/css.js';
import 'tdesign-react/es/message/style/css.js';
import { useAppStore } from '../stores/app';
import { LabelSelect } from './LabelSelect';

interface LabelSelectorProps {
  repoFullName: string;
  onClose: () => void;
}

// 预设颜色
const PRESET_COLORS = [
  '#0052CC', '#00875A', '#FF991F', '#FF5630', '#6554C0',
  '#FFAB00', '#36B37E', '#00B8D9', '#172B4D', '#7A869A',
];

export const LabelSelector: React.FC<LabelSelectorProps> = ({ repoFullName, onClose }) => {
  const { labels, getRepoLabels, setRepoLabels, addLabel, getRepoRemark, setRepoRemark } = useAppStore();
  const [selectedIds, setSelectedIds] = useState<string[]>(getRepoLabels(repoFullName));
  const [remark, setRemark] = useState(getRepoRemark(repoFullName));
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  const handleConfirm = () => {
    setRepoLabels(repoFullName, selectedIds);
    setRepoRemark(repoFullName, remark);
    onClose();
  };

  const handleCreateLabel = () => {
    if (!newName.trim()) {
      MessagePlugin.warning('请输入标签名称');
      return;
    }
    addLabel(newName.trim(), newColor);
    setNewName('');
    setNewColor(PRESET_COLORS[0]);
    setShowCreateDialog(false);
    MessagePlugin.success('标签创建成功');
  };

  return (
    <>
      {/* 背景遮罩 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
        }}
        onClick={onClose}
      />
      
      {/* 主弹窗 */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '24px',
        width: '500px',
        maxHeight: '80vh',
        overflow: 'auto',
        zIndex: 1001,
      }}>
        <h3 style={{ marginBottom: '16px', marginTop: 0 }}>管理标签</h3>
        
        {/* 标签选择 */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>
            选择标签：
          </div>
          {labels.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
              <p style={{ margin: '0 0 12px 0' }}>暂无标签</p>
              <Button size="small" onClick={() => setShowCreateDialog(true)} title="创建第一个标签">
                创建第一个标签
              </Button>
            </div>
          ) : (
            <LabelSelect
              value={selectedIds}
              onChange={setSelectedIds}
              labels={labels}
              placeholder="请选择标签"
              style={{ width: '100%' }}
            />
          )}
        </div>

        {/* 快速创建标签 */}
        <div style={{ marginBottom: '16px' }}>
          <Button
            variant="outline"
            size="small"
            onClick={() => setShowCreateDialog(true)}
            style={{ borderStyle: 'dashed' }}
          >
            + 快速创建新标签
          </Button>
        </div>

        {/* 备注输入框 */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>
            备注：
          </div>
          <Textarea
            value={remark}
            onChange={(value) => setRemark(value)}
            placeholder="添加备注信息..."
            style={{ width: '100%' }}
            autosize={{ minRows: 2, maxRows: 4 }}
          />
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#999' }}>
            {repoFullName}
          </span>
          <Space>
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleConfirm}>
              确定
            </Button>
          </Space>
        </div>
      </div>

      {/* 创建标签弹窗 */}
      <Dialog
        header="快速创建标签"
        visible={showCreateDialog}
        onConfirm={handleCreateLabel}
        onClose={() => {
          setShowCreateDialog(false);
          setNewName('');
          setNewColor(PRESET_COLORS[0]);
        }}
        confirmBtn="创建"
        cancelBtn="取消"
        width="480px"
      >
        <div style={{ padding: '12px 0' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>
              标签名称：
            </div>
            <Input
              value={newName}
              onChange={(value) => setNewName(value)}
              placeholder="输入标签名称"
              style={{ width: '100%' }}
            />
          </div>
          
          <div>
            <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>
              选择颜色：
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {PRESET_COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => setNewColor(c)}
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: c,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: newColor === c ? '2px solid #000' : '2px solid transparent',
                    transition: 'all 0.2s',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#666' }}>预览：</span>
            <Tag
              style={{
                backgroundColor: newColor,
                color: '#fff',
              }}
            >
              {newName || '标签名称'}
            </Tag>
          </div>
        </div>
      </Dialog>
    </>
  );
};
