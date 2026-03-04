import { GitHubRepo, Label, Repos } from '../types';

export interface MergeStats {
  added: number;      // 新增的 Stars
  updated: number;    // 更新的 Stars  
  unchanged: number;  // 未变化的 Stars
  preserved: number;  // 保留的本地数据（已 unstar）
}

export interface MergeResult {
  stars: GitHubRepo[];
  repos: Repos;
  labels: Label[];
  stats: MergeStats;
}

/**
 * 合并 GitHub Stars 数据和本地 JSON 数据
 * @param githubStars 从 GitHub API 获取的最新 Stars
 * @param localRepos 本地保存的仓库数据（包含标签、备注）
 * @param localLabels 本地保存的标签数据
 * @returns 合并后的数据和统计信息
 */
export const mergeStarsData = (
  githubStars: GitHubRepo[],
  localRepos: Repos,
  localLabels: Label[]
): MergeResult => {
  const stats: MergeStats = {
    added: 0,
    updated: 0,
    unchanged: 0,
    preserved: 0,
  };

  // 创建新的 repos 对象
  const newRepos: Repos = { ...localRepos };

  // 创建 GitHub Stars 的 full_name 集合，用于快速查找
  const githubStarsSet = new Set(githubStars.map(star => star.full_name));

  // 遍历 GitHub Stars，合并数据
  githubStars.forEach(star => {
    const fullName = star.full_name;
    const localRepo = localRepos[fullName];

    if (localRepo) {
      // 已存在的仓库，更新信息
      const hasChanges = 
        localRepo.description !== star.description ||
        localRepo.language !== star.language;

      if (hasChanges) {
        stats.updated++;
      } else {
        stats.unchanged++;
      }

      // 更新仓库信息，但保留标签和备注
      newRepos[fullName] = {
        ...localRepo,
        description: star.description,
        language: star.language,
      };
    } else {
      // 新增的仓库
      stats.added++;
      newRepos[fullName] = {
        labels: [],
        description: star.description,
        language: star.language,
      };
    }
  });

  // 检查本地存在但 GitHub 不存在的仓库（用户可能 unstar）
  Object.keys(localRepos).forEach(fullName => {
    if (!githubStarsSet.has(fullName)) {
      // 保留这个仓库的数据
      stats.preserved++;
    }
  });

  return {
    stars: githubStars,
    repos: newRepos,
    labels: localLabels,
    stats,
  };
};

/**
 * 解析 JSON 文件内容
 * @param content JSON 字符串
 * @returns 解析后的数据或 null
 */
export const parseSyncData = (content: string): { 
  stars?: GitHubRepo[]; 
  labels?: Label[]; 
  repos?: Repos;
  lastSyncTime?: string;
} | null => {
  try {
    const data = JSON.parse(content);
    return data;
  } catch (error) {
    console.error('Failed to parse sync data:', error);
    return null;
  }
};

/**
 * 格式化同步统计信息
 * @param stats 统计数据
 * @returns 格式化的文本
 */
export const formatMergeStats = (stats: MergeStats): string => {
  const parts: string[] = [];

  if (stats.added > 0) {
    parts.push(`新增 ${stats.added} 个 Stars`);
  }
  if (stats.updated > 0) {
    parts.push(`更新 ${stats.updated} 个 Stars`);
  }
  if (stats.unchanged > 0) {
    parts.push(`${stats.unchanged} 个 Stars 未变化`);
  }
  if (stats.preserved > 0) {
    parts.push(`保留 ${stats.preserved} 个本地数据（已 unstar）`);
  }

  return parts.join('，');
};
