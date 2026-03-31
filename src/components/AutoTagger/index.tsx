import React, { useState, useCallback, useMemo } from 'react';
import { Dialog, MessagePlugin } from 'tdesign-react';
import { useAppStore, PendingTagChange } from '../../stores/app';
import { generateStarsTags, ProjectInfoForTags } from '../../api/server';
import { BATCH_SIZE } from '../../utils/autoTaggerUtils';
import { AutoTaggerProps, RepoTagStats, GeneratingProgress } from './types';
import { ConfigStep } from './ConfigStep';
import { GeneratingStep } from './GeneratingStep';
import { ConfirmStep } from './ConfirmStep';

export const AutoTagger: React.FC<AutoTaggerProps> = ({ visible, onClose }) => {
  const { stars, repos, findOrCreateLabelByName, setRepoLabels, getRepoLabels } = useAppStore();

  // 状态
  const [step, setStep] = useState<'config' | 'generating' | 'confirm'>('config');
  const [pendingChanges, setPendingChanges] = useState<PendingTagChange[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [selectedChanges, setSelectedChanges] = useState<string[]>([]);
  const [generatingProgress, setGeneratingProgress] = useState<GeneratingProgress>({ current: 0, total: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // 统计项目标签情况
  const repoTagStats = useMemo<RepoTagStats>(() => {
    let withCustomTags = 0;
    let withGeneratedTags = 0;
    let withoutTags = 0;

    (stars || []).forEach(repo => {
      const repoInfo = (repos || {})[repo.full_name];
      const customLabels = repoInfo?.customLabels || [];
      const generatedLabels = repoInfo?.generatedLabels || [];
      const hasLabels = customLabels.length > 0 || generatedLabels.length > 0;

      if (!hasLabels) {
        withoutTags++;
      } else {
        const hasCustom = customLabels.length > 0;
        const hasGenerated = generatedLabels.length > 0;

        if (hasCustom) withCustomTags++;
        if (hasGenerated) withGeneratedTags++;
      }
    });

    return { withCustomTags, withGeneratedTags, withoutTags };
  }, [stars, repos]);

  // 获取未设置标签的项目
  const untaggedRepos = useMemo(() => {
    return (stars || []).filter(repo => {
      const repoInfo = repos[repo.full_name];
      const customLabels = repoInfo?.customLabels || [];
      const generatedLabels = repoInfo?.generatedLabels || [];
      return customLabels.length === 0 && generatedLabels.length === 0;
    });
  }, [stars, repos]);

  // 生成标签
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

          // 构建项目名称到标签的映射
          const projectTagsMap = new Map<string, string[]>();
          if (response.data?.projects && Array.isArray(response.data.projects)) {
            response.data.projects.forEach(p => {
              projectTagsMap.set(p.name, Array.isArray(p.tags) ? p.tags : ['未分类']);
            });
          }

          batch.forEach(repo => {
            const tags = projectTagsMap.get(repo.name) || ['未分类'];
            const currentLabels = getRepoLabels(repo.full_name);
            changes.push({
              repoFullName: repo.full_name,
              repoName: repo.name,
              description: repo.description,
              language: repo.language,
              suggestedTags: tags,
              currentLabelIds: currentLabels,
            });
          });
        } catch (error) {
          console.error(`Batch ${i + 1} failed:`, error);
          if (i === 0) {
            MessagePlugin.error('无法连接到后端服务，请确保后端服务正在运行（http://localhost:8080）');
          }
          batch.forEach(repo => {
            const currentLabels = getRepoLabels(repo.full_name);
            changes.push({
              repoFullName: repo.full_name,
              repoName: repo.name,
              description: repo.description,
              language: repo.language,
              suggestedTags: ['未分类'],
              currentLabelIds: currentLabels,
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
    } catch {
      MessagePlugin.error('标签生成失败');
      setStep('config');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedRepos, untaggedRepos, getRepoLabels]);

  // 重置状态
  const resetState = useCallback(() => {
    setStep('config');
    setPendingChanges([]);
    setSelectedRepos([]);
    setSelectedChanges([]);
    setGeneratingProgress({ current: 0, total: 0 });
  }, []);

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

        const tags = Array.isArray(change.suggestedTags) ? change.suggestedTags : [];

        const labelIds = tags.map(tagName => {
          const labelId = findOrCreateLabelByName(tagName, 'generated');
          return labelId;
        }).filter(id => id);

        if (labelIds.length > 0) {
          setRepoLabels(change.repoFullName, labelIds, 'generated');
          appliedCount++;
        }
      }

      MessagePlugin.success(`已为 ${appliedCount} 个项目应用标签`);
      onClose();
      resetState();
    } catch {
      MessagePlugin.error('应用标签失败');
    } finally {
      setIsApplying(false);
    }
  }, [pendingChanges, selectedChanges, findOrCreateLabelByName, setRepoLabels, onClose, resetState]);

  // 关闭时重置
  const handleClose = useCallback(() => {
    onClose();
    resetState();
  }, [onClose, resetState]);

  // 重新选择
  const handleReselect = useCallback(() => {
    setStep('config');
    setPendingChanges([]);
    setSelectedChanges([]);
  }, []);

  return (
    <Dialog
      header="自动标签生成"
      visible={visible}
      onClose={handleClose}
      width="800px"
      footer={null}
    >
      {step === 'config' && (
        <ConfigStep
          repoTagStats={repoTagStats}
          stars={stars || []}
          selectedRepos={selectedRepos}
          onSelectionChange={setSelectedRepos}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          onCancel={handleClose}
        />
      )}

      {step === 'generating' && (
        <GeneratingStep progress={generatingProgress} />
      )}

      {step === 'confirm' && (
        <ConfirmStep
          pendingChanges={pendingChanges}
          selectedChanges={selectedChanges}
          onSelectionChange={setSelectedChanges}
          onApply={handleApply}
          onReselect={handleReselect}
          onCancel={handleClose}
          isApplying={isApplying}
        />
      )}
    </Dialog>
  );
};
