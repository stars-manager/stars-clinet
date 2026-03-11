import React, { useState, useMemo } from 'react';
import Button from 'tdesign-react/es/button';
import Space from 'tdesign-react/es/space';
import Input from 'tdesign-react/es/input';
import Dialog from 'tdesign-react/es/dialog';
import Tag from 'tdesign-react/es/tag';
import Tabs from 'tdesign-react/es/tabs';
import { MessagePlugin } from 'tdesign-react/es/message';
import 'tdesign-react/es/button/style/css.js';
import 'tdesign-react/es/space/style/css.js';
import 'tdesign-react/es/input/style/css.js';
import 'tdesign-react/es/dialog/style/css.js';
import 'tdesign-react/es/tag/style/css.js';
import 'tdesign-react/es/tabs/style/css.js';
import 'tdesign-react/es/message/style/css.js';
import { useAppStore } from '../stores/app';
import { Label } from '../types';

// 预设颜色
const PRESET_COLORS = [
  '#0052CC', // 蓝色
  '#00875A', // 绿色
  '#FF991F', // 橙色
  '#FF5630', // 红色
  '#6554C0', // 紫色
  '#FFAB00', // 黄色
  '#36B37E', // 青色
  '#00B8D9', // 天蓝
  '#172B4D', // 深蓝
  '#7A869A', // 灰色
];

interface LabelManagerProps {
  onClose: () => void;
}

export const LabelManager: React.FC<LabelManagerProps> = ({ onClose }) => {
  const { labels, repos, addLabel, updateLabel, deleteLabel } = useAppStore();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [activeTab, setActiveTab] = useState<'all' | 'custom' | 'generated'>('all');

  // 按类型分组标签
  const groupedLabels = useMemo(() => {
    const custom = labels.filter(l => l.type === 'custom' || !l.type);
    const generated = labels.filter(l => l.type === 'generated');
    return { custom, generated };
  }, [labels]);

  // 根据当前标签页过滤标签
  const filteredLabels = useMemo(() => {
    switch (activeTab) {
      case 'custom':
        return groupedLabels.custom;
      case 'generated':
        return groupedLabels.generated;
      default:
        return labels;
    }
  }, [activeTab, labels, groupedLabels]);

  const getLabelCount = (labelId: string): number => {
    return Object.values(repos).filter(repo => repo.labels.includes(labelId)).length;
  };

  const handleAdd = () => {
    if (!name.trim()) {
      MessagePlugin.warning('请输入标签名称');
      return;
    }
    addLabel(name.trim(), color, 'custom');
    setName('');
    setColor(PRESET_COLORS[0]);
    setShowAddDialog(false);
    MessagePlugin.success('标签创建成功');
  };

  const handleEdit = (label: Label) => {
    setEditingLabel(label);
    setName(label.name);
    setColor(label.color);
  };

  const handleSaveEdit = () => {
    if (!name.trim()) {
      MessagePlugin.warning('请输入标签名称');
      return;
    }
    if (editingLabel) {
      updateLabel(editingLabel.id, name.trim(), color);
      setEditingLabel(null);
      setName('');
      setColor(PRESET_COLORS[0]);
      MessagePlugin.success('标签更新成功');
    }
  };

  const handleDelete = (label: Label) => {
    const count = getLabelCount(label.id);
    if (count > 0) {
      const confirmed = window.confirm(`该标签下有 ${count} 个项目，删除后将从所有项目中移除。确定删除？`);
      if (!confirmed) return;
    }
    deleteLabel(label.id);
    MessagePlugin.success('标签删除成功');
  };

  const resetForm = () => {
    setName('');
    setColor(PRESET_COLORS[0]);
    setEditingLabel(null);
  };

  const renderColorPicker = () => (
    <div>
      <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
        选择颜色：
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {PRESET_COLORS.map(c => (
          <div
            key={c}
            onClick={() => setColor(c)}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: c,
              borderRadius: '4px',
              cursor: 'pointer',
              border: color === c ? '2px solid #000' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: '#666' }}>自定义：</span>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{ width: '40px', height: '32px', border: 'none', cursor: 'pointer' }}
        />
        <Input
          value={color}
          onChange={(value) => setColor(value)}
          placeholder="#000000"
          style={{ width: '100px' }}
        />
      </div>
    </div>
  );

  const renderLabelCard = (label: Label) => {
    const count = getLabelCount(label.id);
    return (
      <div
        key={label.id}
        style={{
          padding: '16px',
          border: '1px solid #e7e7e7',
          borderRadius: '8px',
          transition: 'all 0.2s',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                backgroundColor: label.color,
                borderRadius: '4px',
              }}
            />
            <span style={{ fontSize: '16px', fontWeight: 500 }}>{label.name}</span>
            {label.type === 'generated' && (
              <Tag size="small" theme="primary" variant="light">
                AI 生成
              </Tag>
            )}
          </div>
          <Space size="small">
            <Button
              size="small"
              variant="text"
              onClick={() => handleEdit(label)}
              title="编辑标签名称和颜色"
            >
              编辑
            </Button>
            <Button
              size="small"
              variant="text"
              theme="danger"
              onClick={() => handleDelete(label)}
              title="删除该标签"
            >
              删除
            </Button>
          </Space>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tag theme="primary" variant="light">
            {count} 个项目
          </Tag>
          <div
            style={{
              flex: 1,
              height: '4px',
              backgroundColor: '#f5f5f5',
              borderRadius: '2px',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, (count / Math.max(...labels.map(l => getLabelCount(l.id)))) * 100)}%`,
                height: '100%',
                backgroundColor: label.color,
                borderRadius: '2px',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
      </div>
    );
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
        width: '800px',
        maxHeight: '80vh',
        overflow: 'auto',
        zIndex: 1001,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>标签管理</h2>
          <Space>
            <Button onClick={() => setShowAddDialog(true)} title="创建新的标签">
              + 新建标签
            </Button>
            <Button variant="outline" onClick={onClose} title="关闭标签管理">
              关闭
            </Button>
          </Space>
        </div>

        {/* 标签分类统计 */}
        <div style={{ 
          marginBottom: '20px',
          padding: '12px 16px',
          background: '#f5f5f5',
          borderRadius: '8px',
          display: 'flex',
          gap: '24px'
        }}>
          <div>
            <span style={{ color: '#666' }}>总计：</span>
            <span style={{ fontWeight: 500 }}>{labels.length}</span>
          </div>
          <div>
            <span style={{ color: '#666' }}>个人标签：</span>
            <span style={{ fontWeight: 500, color: '#0052D9' }}>{groupedLabels.custom.length}</span>
          </div>
          <div>
            <span style={{ color: '#666' }}>AI 生成：</span>
            <span style={{ fontWeight: 500, color: '#2BA47D' }}>{groupedLabels.generated.length}</span>
          </div>
        </div>

        {/* 标签分类 Tab */}
        <Tabs
          value={activeTab}
          onChange={(value) => setActiveTab(value as 'all' | 'custom' | 'generated')}
          style={{ marginBottom: '20px' }}
        >
          <Tabs.TabPanel value="all" label={`全部 (${labels.length})`} />
          <Tabs.TabPanel value="custom" label={`个人标签 (${groupedLabels.custom.length})`} />
          <Tabs.TabPanel value="generated" label={`AI 生成 (${groupedLabels.generated.length})`} />
        </Tabs>

        {filteredLabels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>
              {activeTab === 'all' ? '暂无标签' : activeTab === 'custom' ? '暂无个人标签' : '暂无 AI 生成的标签'}
            </p>
            <p style={{ fontSize: '14px' }}>点击"新建标签"创建你的第一个标签</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filteredLabels.map(renderLabelCard)}
          </div>
        )}
      </div>

      {/* 添加标签弹窗 */}
      <Dialog
        header="新建标签"
        visible={showAddDialog}
        onConfirm={handleAdd}
        onClose={() => {
          setShowAddDialog(false);
          resetForm();
        }}
        confirmBtn="创建"
        cancelBtn="取消"
        width="480px"
      >
        <div style={{ padding: '12px 0' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
              标签名称：
            </div>
            <Input
              value={name}
              onChange={(value) => setName(value)}
              placeholder="输入标签名称"
              style={{ width: '100%' }}
            />
          </div>
          {renderColorPicker()}
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#666' }}>预览：</span>
            <Tag
              style={{
                backgroundColor: color,
                color: '#fff',
              }}
            >
              {name || '标签名称'}
            </Tag>
          </div>
        </div>
      </Dialog>

      {/* 编辑标签弹窗 */}
      <Dialog
        header="编辑标签"
        visible={!!editingLabel}
        onConfirm={handleSaveEdit}
        onClose={() => {
          setEditingLabel(null);
          resetForm();
        }}
        confirmBtn="保存"
        cancelBtn="取消"
        width="480px"
      >
        <div style={{ padding: '12px 0' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666' }}>
              标签名称：
            </div>
            <Input
              value={name}
              onChange={(value) => setName(value)}
              placeholder="输入标签名称"
              style={{ width: '100%' }}
            />
          </div>
          {renderColorPicker()}
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#666' }}>预览：</span>
            <Tag
              style={{
                backgroundColor: color,
                color: '#fff',
              }}
            >
              {name || '标签名称'}
            </Tag>
          </div>
        </div>
      </Dialog>
    </>
  );
};
