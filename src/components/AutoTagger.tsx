import React, { useState, useCallback, useMemo } from 'react';
import Button from 'tdesign-react/es/button';
import Space from 'tdesign-react/es/space';
import Dialog from 'tdesign-react/es/dialog';
import Tag from 'tdesign-react/es/tag';
import Loading from 'tdesign-react/es/loading';
import Tree from 'tdesign-react/es/tree';
import Input from 'tdesign-react/es/input';
import { MessagePlugin } from 'tdesign-react/es/message';
import 'tdesign-react/es/button/style/css.js';
import 'tdesign-react/es/space/style/css.js';
import 'tdesign-react/es/dialog/style/css.js';
import 'tdesign-react/es/tag/style/css.js';
import 'tdesign-react/es/loading/style/css.js';
import 'tdesign-react/es/message/style/css.js';
import 'tdesign-react/es/tree/style/css.js';
import 'tdesign-react/es/input/style/css.js';
import { useAppStore, PendingTagChange } from '../stores/app';
import { generateStarsTags, ProjectInfoForTags } from '../api/server';

interface AutoTaggerProps {
  visible: boolean;
  onClose: () => void;
}

// 每批次处理的项目数（后端限制 20 个）
const BATCH_SIZE = 20;

export const AutoTagger: React.FC<AutoTaggerProps> = ({ visible, onClose }) => {
  const { stars, repos, labels, findOrCreateLabelByName, setRepoLabels } = useAppStore();

  // 状态
  const [step, setStep] = useState<'config' | 'generating' | 'confirm'>('config');
  const [pendingChanges, setPendingChanges] = useState<PendingTagChange[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]); // 配置步骤选中的项目
  const [selectedChanges, setSelectedChanges] = useState<string[]>([]); // 确认步骤选中的项目
  const [searchKeyword, setSearchKeyword] = useState(''); // 搜索关键字
  const [generatingProgress, setGeneratingProgress] = useState({ current: 0, total: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // 获取标签类型映射
  const labelTypeMap = useMemo(() => {
    const map = new Map<string, 'custom' | 'generated'>();
    const labelsList = labels || [];
    labelsList.forEach(label => {
      map.set(label.id, label.type || 'custom');
    });
    return map;
  }, [labels]);

  // 统计项目标签情况（同时考虑自定义标签和 AI 生成标签）
  const repoTagStats = useMemo(() => {
    let withCustomTags = 0;
    let withGeneratedTags = 0;
    let withoutTags = 0;

    (stars || []).forEach(repo => {
      const repoLabels = (repos || {})[repo.full_name]?.labels || [];
      if (repoLabels.length === 0) {
        withoutTags++;
      } else {
        const hasCustom = repoLabels.some(labelId => (labelTypeMap || new Map()).get(labelId) === 'custom');
        const hasGenerated = repoLabels.some(labelId => (labelTypeMap || new Map()).get(labelId) === 'generated');

        if (hasCustom) withCustomTags++;
        if (hasGenerated) withGeneratedTags++;
      }
    });

    return { withCustomTags, withGeneratedTags, withoutTags };
  }, [stars, repos, labels]); // 直接依赖 labels 而不是 labelTypeMap

  // 获取未设置标签的项目（没有任何标签）
  const untaggedRepos = (stars || []).filter(repo => {
    const repoLabels = repos[repo.full_name]?.labels || [];
    return repoLabels.length === 0;
  });

  // 过滤后的未设置标签项目
  const filteredUntaggedRepos = useMemo(() => {
    if (!searchKeyword || !searchKeyword.trim()) return untaggedRepos;
    const keyword = searchKeyword.toLowerCase();
    return untaggedRepos.filter(repo =>
      repo.full_name.toLowerCase().includes(keyword) ||
      repo.name.toLowerCase().includes(keyword) ||
      (repo.description && repo.description.toLowerCase().includes(keyword)) ||
      (repo.language && repo.language.toLowerCase().includes(keyword))
    );
  }, [untaggedRepos, searchKeyword]);

  // 构建未设置标签项目的树形数据
  const untaggedTreeData = useMemo(() => {
    const repos = filteredUntaggedRepos || [];
    const totalBatches = Math.ceil(repos.length / BATCH_SIZE);
    const batches: any[] = [];

    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE + 1;
      const end = Math.min((i + 1) * BATCH_SIZE, repos.length);
      const batchRepos = repos.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

      batches.push({
        value: `batch-${i}`,
        label: `第 ${i + 1} 组 (${start}-${end})`,
        children: batchRepos.map(repo => ({
          value: repo.full_name,
          label: repo.language ? `${repo.full_name} (${repo.language})` : repo.full_name,
          repo,
        })),
      });
    }

    return [{
      value: 'all',
      label: `全部项目 (${repos.length})`,
      children: batches,
    }];
  }, [filteredUntaggedRepos]);

  // 获取 Tree 的 checked 值
  const untaggedTreeChecked = useMemo(() => {
    const selectedSet = new Set(selectedRepos);
    const repos = filteredUntaggedRepos || [];

    // 检查是否全选
    const allSelected = repos.length > 0 && repos.every(r => selectedSet.has(r.full_name));
    if (allSelected) {
      return ['all'];
    }

    const checked: string[] = [];
    const totalBatches = Math.ceil(repos.length / BATCH_SIZE);

    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, repos.length);
      const batchRepos = repos.slice(start, end);
      const allBatchSelected = batchRepos.every(r => selectedSet.has(r.full_name));

      if (allBatchSelected && batchRepos.length > 0) {
        checked.push(`batch-${i}`);
      } else {
        batchRepos.forEach(r => {
          if (selectedSet.has(r.full_name)) {
            checked.push(r.full_name);
          }
        });
      }
    }

    return checked;
  }, [selectedRepos, filteredUntaggedRepos]);

  // 处理 Tree 的选中变化
  const handleUntaggedCheck = useCallback((value: any, context: any) => {
    const filteredRepos = filteredUntaggedRepos || [];

    // 如果选中的包含 'all'，展开为所有叶子节点
    if (value && value.includes && value.includes('all')) {
      setSelectedRepos(filteredRepos.map(r => r.full_name));
      return;
    }

    const selected = new Set<string>();
    (value || []).forEach((item: string) => {
      if (item.startsWith('batch-')) {
        // 分组节点：展开为该组的所有项目
        const batchIndex = parseInt(item.replace('batch-', ''), 10);
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, filteredRepos.length);
        for (let i = start; i < end; i++) {
          selected.add(filteredRepos[i].full_name);
        }
      } else {
        // 叶子节点（项目 full_name）
        selected.add(item);
      }
    });

    setSelectedRepos(Array.from(selected));
  }, [filteredUntaggedRepos]);

  // 获取实际选中的项目数量（基于原始数据）
  const actualSelectedCount = selectedRepos.length;

  // 判断当前过滤结果是否全部选中
  const isAllFilteredSelected = (filteredUntaggedRepos || []).length > 0 &&
    (filteredUntaggedRepos || []).every(r => selectedRepos.includes(r.full_name));

  // 批量选择操作（配置步骤）
  const handleBatchSelect = useCallback((type: 'untagged') => {
    if (type === 'untagged') {
      // 选择所有未设置标签的项目（基于当前过滤结果）
      const currentFilteredSet = new Set((filteredUntaggedRepos || []).map(r => r.full_name));
      setSelectedRepos(Array.from(currentFilteredSet));
    }
  }, [filteredUntaggedRepos]);

  // 全选/取消全选（基于当前过滤结果）
  const handleSelectAll = useCallback(() => {
    const filteredRepos = filteredUntaggedRepos || [];

    // 使用函数式更新来获取最新的 selectedRepos
    setSelectedRepos(prevSelected => {
      const currentFilteredSet = new Set(filteredRepos.map(r => r.full_name));

      // 检查当前过滤结果是否全部已选中
      const allFilteredSelected = filteredRepos.length > 0 &&
        filteredRepos.every(r => prevSelected.includes(r.full_name));

      if (allFilteredSelected) {
        // 取消全选：清空所有选中
        return [];
      } else {
        // 全选：选中所有当前过滤后的项目
        return Array.from(currentFilteredSet);
      }
    });
  }, [filteredUntaggedRepos]);

  // 生成标签（只为选中的项目生成）
  const handleGenerate = useCallback(async () => {
    if (selectedRepos.length === 0) {
      MessagePlugin.warning('请先选择要生成标签的项目');
      return;
    }

    setIsGenerating(true);
    setStep('generating');
    setGeneratingProgress({ current: 0, total: selectedRepos.length });

    const changes: PendingTagChange[] = [];
    const selectedReposList = untaggedRepos.filter(r => selectedRepos.includes(r.full_name));
    const totalBatches = Math.ceil(selectedReposList.length / BATCH_SIZE);

    try {
      for (let i = 0; i < totalBatches; i++) {
        const batch = selectedReposList.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

        const projects: ProjectInfoForTags[] = batch.map(repo => ({
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description || undefined,
          language: repo.language || undefined,
          url: repo.html_url,
          stars: repo.stargazers_count,
        }));

        try {
          const response = await generateStarsTags({ projects });

          batch.forEach(repo => {
            changes.push({
              repoFullName: repo.full_name,
              repoName: repo.name,
              description: repo.description,
              language: repo.language,
              suggestedTags: response.tags,
              currentLabelIds: repos[repo.full_name]?.labels || [],
            });
          });
        } catch (error) {
          console.error(`Batch ${i + 1} failed:`, error);
          if (i === 0) {
            MessagePlugin.error('无法连接到后端服务，请确保后端服务正在运行（http://localhost:8080）');
          }
          batch.forEach(repo => {
            changes.push({
              repoFullName: repo.full_name,
              repoName: repo.name,
              description: repo.description,
              language: repo.language,
              suggestedTags: ['未分类'],
              currentLabelIds: repos[repo.full_name]?.labels || [],
            });
          });
        }

        setGeneratingProgress({ current: (i + 1) * BATCH_SIZE, total: selectedReposList.length });

        if (i < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setPendingChanges(changes);
      setSelectedChanges(changes.map(c => c.repoFullName));
      setStep('confirm');
    } catch (error) {
      MessagePlugin.error('标签生成失败');
      setStep('config');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedRepos, untaggedRepos, repos]);

  // 应用选中的标签变更
  const handleApply = useCallback(async () => {
    if (selectedChanges.length === 0) {
      MessagePlugin.warning('请至少选择一个项目');
      return;
    }

    setIsApplying(true);

    try {
      let appliedCount = 0;

      for (const change of pendingChanges) {
        if (!selectedChanges.includes(change.repoFullName)) continue;

        // 为每个建议的标签创建或查找标签
        const labelIds = change.suggestedTags.map(tagName =>
          findOrCreateLabelByName(tagName, 'generated')
        );

        setRepoLabels(change.repoFullName, labelIds);
        appliedCount++;
      }

      MessagePlugin.success(`已为 ${appliedCount} 个项目应用标签`);
      onClose();
      resetState();
    } catch (error) {
      MessagePlugin.error('应用标签失败');
    } finally {
      setIsApplying(false);
    }
  }, [pendingChanges, selectedChanges, findOrCreateLabelByName, setRepoLabels, onClose]);

  // 确认步骤：构建已生成标签项目的树形数据
  const confirmTreeData = useMemo(() => {
    const totalBatches = Math.ceil(pendingChanges.length / BATCH_SIZE);
    const batches: { value: string; label: string; children: any[] }[] = [];

    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE + 1;
      const end = Math.min((i + 1) * BATCH_SIZE, pendingChanges.length);
      const batchRepos = pendingChanges.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

      batches.push({
        value: `batch-${i}`,
        label: `第 ${i + 1} 组 (${start}-${end})`,
        children: batchRepos.map(change => ({
          value: change.repoFullName,
          label: `${change.repoFullName} → ${change.suggestedTags.join(', ')}`,
          change,
        })),
      });
    }

    return [{
      value: 'all',
      label: `全部项目 (${pendingChanges.length})`,
      children: batches,
    }];
  }, [pendingChanges]);

  // 确认步骤：Tree 选中变化处理
  const handleConfirmCheck = useCallback((value: any) => {
    const changes = pendingChanges || [];

    if (value && value.includes('all')) {
      setSelectedChanges(changes.map(c => c.repoFullName));
      return;
    }

    const selected = new Set<string>();
    (value || []).forEach((item: string) => {
      if (item.startsWith('batch-')) {
        const batchIndex = parseInt(item.replace('batch-', ''), 10);
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, changes.length);
        for (let i = start; i < end; i++) {
          selected.add(changes[i].repoFullName);
        }
      } else {
        selected.add(item);
      }
    });

    setSelectedChanges(Array.from(selected));
  }, [pendingChanges]);

  // 确认步骤：获取 Tree 的 checked 值
  const confirmTreeChecked = useMemo(() => {
    const changes = pendingChanges || [];
    const selectedSet = new Set(selectedChanges || []);

    if (selectedChanges.length === changes.length && changes.length > 0) {
      return ['all'];
    }

    const checked: string[] = [];
    const totalBatches = Math.ceil(changes.length / BATCH_SIZE);
    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, changes.length);
      const batchRepos = changes.slice(start, end);
      const allSelected = batchRepos.every(c => selectedSet.has(c.repoFullName));

      if (allSelected && batchRepos.length > 0) {
        checked.push(`batch-${i}`);
      } else {
        batchRepos.forEach(c => {
          if (selectedSet.has(c.repoFullName)) {
            checked.push(c.repoFullName);
          }
        });
      }
    }

    return checked;
  }, [selectedChanges, pendingChanges]);

  // 重置状态
  const resetState = useCallback(() => {
    setStep('config');
    setPendingChanges([]);
    setSelectedRepos([]);
    setSelectedChanges([]);
    setSearchKeyword('');
    setGeneratingProgress({ current: 0, total: 0 });
  }, []);

  // 关闭时重置
  const handleClose = useCallback(() => {
    onClose();
    resetState();
  }, [onClose, resetState]);

  return (
    <Dialog
      header="自动标签生成"
      visible={visible}
      onClose={handleClose}
      width="800px"
      footer={null}
    >
      {/* 配置步骤：选择项目 */}
      {step === 'config' && (
        <div style={{ padding: '12px 0' }}>
          {/* 统计信息 */}
          <div style={{
            padding: '16px',
            background: '#f5f5f5',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '14px', color: '#333', marginBottom: '12px' }}>
              统计信息
            </div>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ color: '#666' }}>总项目数：</span>
                <span style={{ fontWeight: 500 }}>{stars?.length || 0}</span>
              </div>
              <div>
                <span style={{ color: '#666' }}>未设置标签：</span>
                <span style={{ fontWeight: 500, color: '#E37318' }}>{repoTagStats.withoutTags ?? 0}</span>
              </div>
              <div>
                <span style={{ color: '#666' }}>自定义标签：</span>
                <span style={{ fontWeight: 500, color: '#0052D9' }}>{repoTagStats.withCustomTags ?? 0}</span>
              </div>
              <div>
                <span style={{ color: '#666' }}>AI 生成标签：</span>
                <span style={{ fontWeight: 500, color: '#2BA47D' }}>{repoTagStats.withGeneratedTags ?? 0}</span>
              </div>
            </div>
          </div>

          {repoTagStats.withoutTags === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
              所有项目都已设置标签，无需生成
            </div>
          ) : (
            <>
              {/* 搜索框 + 工具栏 */}
              <div style={{ marginBottom: '12px' }}>
                <Input
                  placeholder="搜索项目名称、描述或语言..."
                  value={searchKeyword}
                  onChange={setSearchKeyword}
                  clearable
                  style={{ marginBottom: '12px' }}
                />
                <div style={{
                  padding: '12px',
                  background: '#e3f2fd',
                  borderRadius: '4px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: '#1565c0', fontWeight: 500 }}>
                      选择要生成标签的项目
                    </span>
                    <Space>
                      <Button size="small" variant="outline" onClick={() => handleBatchSelect('untagged')}>
                        未设置标签
                      </Button>
                      <Button
                        size="small"
                        theme={isAllFilteredSelected ? 'primary' : 'default'}
                        variant={isAllFilteredSelected ? 'base' : 'outline'}
                        onClick={handleSelectAll}
                      >
                        {isAllFilteredSelected ? '取消全选' : '全选'}
                      </Button>
                    </Space>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#666', fontSize: '14px' }}>已选择：</span>
                    <span style={{ color: '#0052D9', fontWeight: 500, fontSize: '16px' }}>{actualSelectedCount}</span>
                    <span style={{ color: '#999' }}> 个项目</span>
                    {filteredUntaggedRepos.length < untaggedRepos.length && (
                      <Tag size="small" theme="warning" variant="light">
                        筛选显示 {filteredUntaggedRepos.length} / {untaggedRepos.length}
                      </Tag>
                    )}
                  </div>
                </div>
              </div>

              {/* Tree 选择器 */}
              <div style={{
                marginBottom: '16px',
                border: '1px solid #e7e7e7',
                borderRadius: '4px',
                maxHeight: '300px',
                overflow: 'auto'
              }}>
                <Tree
                  data={untaggedTreeData}
                  checkable
                  expandAll
                  value={untaggedTreeChecked}
                  onChange={handleUntaggedCheck}
                  activeMultiple
                />
              </div>

              <div style={{ fontSize: '12px', color: '#999', marginBottom: '16px' }}>
                提示：点击分组节点可一次性选择该组内 20 个项目
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <Button variant="outline" onClick={handleClose}>
                  取消
                </Button>
                <Button
                  theme="primary"
                  onClick={handleGenerate}
                  loading={isGenerating}
                  disabled={actualSelectedCount === 0}
                >
                  开始生成标签 ({actualSelectedCount})
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 生成中步骤 */}
      {step === 'generating' && (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <Loading text="正在生成标签..." />
          <div style={{ marginTop: '16px', color: '#666' }}>
            已处理 {Math.min(generatingProgress.current, generatingProgress.total)} / {generatingProgress.total} 个项目
          </div>
          <div style={{ 
            marginTop: '12px', 
            width: '300px', 
            height: '8px',
            background: '#f5f5f5',
            borderRadius: '4px',
            margin: '12px auto'
          }}>
            <div style={{
              width: `${(generatingProgress.current / generatingProgress.total) * 100}%`,
              height: '100%',
              background: '#0052D9',
              borderRadius: '4px',
              transition: 'width 0.3s'
            }} />
          </div>
        </div>
      )}

      {/* 确认步骤：查看生成的标签并确认应用 */}
      {step === 'confirm' && (
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
                  onClick={() => selectedChanges.length === pendingChanges.length ? setSelectedChanges([]) : setSelectedChanges(pendingChanges.map(c => c.repoFullName))}
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

          {/* Tree 选择器 - 显示项目及建议标签 */}
          <div style={{
            marginBottom: '16px',
            border: '1px solid #e7e7e7',
            borderRadius: '4px',
            maxHeight: '300px',
            overflow: 'auto'
          }}>
            <Tree
              data={confirmTreeData}
              checkable
              expandAll
              checked={confirmTreeChecked}
              onCheck={handleConfirmCheck}
            />
          </div>

          {/* 已选项目预览 - 显示标签建议 */}
          {selectedChanges.length > 0 && (
            <div style={{
              maxHeight: '200px',
              overflow: 'auto',
              border: '1px solid #e7e7e7',
              borderRadius: '4px',
              padding: '12px',
              background: '#fafafa'
            }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                已选项目预览（显示建议标签，前10个）：
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingChanges
                  .filter(c => selectedChanges.includes(c.repoFullName))
                  .slice(0, 10)
                  .map(change => (
                    <div key={change.repoFullName} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <Tag size="small" theme="primary" variant="outline">
                        {change.repoFullName}
                      </Tag>
                      <span style={{ color: '#999', fontSize: '12px' }}>→</span>
                      {change.suggestedTags.map((tag, idx) => (
                        <Tag key={idx} size="small" theme="success" variant="light">
                          {tag}
                        </Tag>
                      ))}
                    </div>
                  ))}
                {selectedChanges.length > 10 && (
                  <Tag size="small" theme="default">
                    ...等 {selectedChanges.length} 个项目
                  </Tag>
                )}
              </div>
            </div>
          )}

          {/* 底部操作栏 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '16px'
          }}>
            <div style={{ fontSize: '12px', color: '#999' }}>
              提示：可在上方调整要应用标签的项目
            </div>
            <Space>
              <Button variant="outline" onClick={() => setStep('config')}>
                重新选择
              </Button>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button
                theme="primary"
                onClick={handleApply}
                loading={isApplying}
                disabled={selectedChanges.length === 0}
              >
                应用选中标签 ({selectedChanges.length})
              </Button>
            </Space>
          </div>
        </div>
      )}
    </Dialog>
  );
};
