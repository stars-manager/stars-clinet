import { Repos } from '../types';

export interface ChangeInfo {
  type: 'added' | 'updated' | 'removed';
  repoFullName: string;
  field: 'label' | 'remark';
  oldValue?: string | string[];
  newValue?: string | string[];
}

export interface IncrementalStats {
  labelChanges: ChangeInfo[];
  remarkChanges: ChangeInfo[];
  summary: {
    labelsAdded: number;
    labelsRemoved: number;
    remarksAdded: number;
    remarksUpdated: number;
    remarksRemoved: number;
  };
}

/**
 * 计算本地数据和远程数据的增量变化
 * @param localRepos 本地数据
 * @param remoteRepos 远程数据（从仓库读取）
 * @returns 增量变化信息
 */
export const calculateIncrementalChanges = (
  localRepos: Repos,
  remoteRepos: Repos
): IncrementalStats => {
  const labelChanges: ChangeInfo[] = [];
  const remarkChanges: ChangeInfo[] = [];

  // 获取所有仓库的 full_name
  const allRepoNames = new Set([
    ...Object.keys(localRepos),
    ...Object.keys(remoteRepos),
  ]);

  allRepoNames.forEach((repoFullName) => {
    const localRepo = localRepos[repoFullName];
    const remoteRepo = remoteRepos[repoFullName];

    // 检查标签变化
    const localLabels = [...(localRepo?.customLabels || []), ...(localRepo?.generatedLabels || [])];
    const remoteLabels = [...(remoteRepo?.customLabels || []), ...(remoteRepo?.generatedLabels || [])];

    if (localLabels.length !== remoteLabels.length ||
        !localLabels.every((l: string) => remoteLabels.includes(l))) {
      // 标签有变化
      const addedLabels = localLabels.filter((l: string) => !remoteLabels.includes(l));
      const removedLabels = remoteLabels.filter((l: string) => !localLabels.includes(l));

      if (addedLabels.length > 0) {
        labelChanges.push({
          type: 'added',
          repoFullName,
          field: 'label',
          oldValue: remoteLabels,
          newValue: localLabels,
        });
      }
      if (removedLabels.length > 0) {
        labelChanges.push({
          type: 'removed',
          repoFullName,
          field: 'label',
          oldValue: remoteLabels,
          newValue: localLabels,
        });
      }
    }

    // 检查备注变化
    const localRemark = localRepo?.remark || '';
    const remoteRemark = remoteRepo?.remark || '';

    if (localRemark !== remoteRemark) {
      if (!remoteRemark && localRemark) {
        // 新增备注
        remarkChanges.push({
          type: 'added',
          repoFullName,
          field: 'remark',
          oldValue: '',
          newValue: localRemark,
        });
      } else if (remoteRemark && !localRemark) {
        // 删除备注
        remarkChanges.push({
          type: 'removed',
          repoFullName,
          field: 'remark',
          oldValue: remoteRemark,
          newValue: '',
        });
      } else {
        // 更新备注
        remarkChanges.push({
          type: 'updated',
          repoFullName,
          field: 'remark',
          oldValue: remoteRemark,
          newValue: localRemark,
        });
      }
    }
  });

  // 统计摘要
  const summary = {
    labelsAdded: labelChanges.filter(c => c.type === 'added').length,
    labelsRemoved: labelChanges.filter(c => c.type === 'removed').length,
    remarksAdded: remarkChanges.filter(c => c.type === 'added').length,
    remarksUpdated: remarkChanges.filter(c => c.type === 'updated').length,
    remarksRemoved: remarkChanges.filter(c => c.type === 'removed').length,
  };

  return {
    labelChanges,
    remarkChanges,
    summary,
  };
};

/**
 * 格式化变化信息
 */
export const formatChangeSummary = (stats: IncrementalStats): string[] => {
  const messages: string[] = [];
  const { summary } = stats;

  if (summary.labelsAdded > 0) {
    messages.push(`新增 ${summary.labelsAdded} 个标签`);
  }
  if (summary.labelsRemoved > 0) {
    messages.push(`移除 ${summary.labelsRemoved} 个标签`);
  }
  if (summary.remarksAdded > 0) {
    messages.push(`新增 ${summary.remarksAdded} 个备注`);
  }
  if (summary.remarksUpdated > 0) {
    messages.push(`更新 ${summary.remarksUpdated} 个备注`);
  }
  if (summary.remarksRemoved > 0) {
    messages.push(`删除 ${summary.remarksRemoved} 个备注`);
  }

  return messages;
};
