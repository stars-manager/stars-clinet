import { GitHubRepo, Label, Repos } from '../types';

export const generateReadme = (
  stars: GitHubRepo[],
  labels: Label[],
  repos: Repos,
  username: string
): string => {
  const lines: string[] = [
    `# ${username}'s GitHub Stars`,
    '',
    `> 由 GitHub Star Manager 管理`,
    '',
    `总计: ${stars.length} 个 Stars`,
    '',
    '---',
    '',
    '## 标签分类',
    '',
  ];

  // 按标签分组
  const labelMap = new Map<string, GitHubRepo[]>();

  // 未分类的项目
  const uncategorized: GitHubRepo[] = [];

  stars.forEach(star => {
    const repoLabelsArr = repos[star.full_name]?.labels || [];

    if (repoLabelsArr.length === 0) {
      uncategorized.push(star);
    } else {
      repoLabelsArr.forEach(labelId => {
        const existing = labelMap.get(labelId) || [];
        existing.push(star);
        labelMap.set(labelId, existing);
      });
    }
  });

  // 输出有标签的分类
  labels.forEach(label => {
    const repoList = labelMap.get(label.id);
    if (repoList && repoList.length > 0) {
      lines.push(`### ${label.name} (${repoList.length})`);
      lines.push('');
      repoList.forEach(repo => {
        lines.push(`- [${repo.full_name}](${repo.html_url}) ⭐ ${formatStars(repo.stargazers_count)}`);
        if (repo.description) {
          lines.push(`  - ${repo.description}`);
        }
      });
      lines.push('');
    }
  });

  // 输出未分类的
  if (uncategorized.length > 0) {
    lines.push(`### 未分类 (${uncategorized.length})`);
    lines.push('');
    uncategorized.forEach(repo => {
      lines.push(`- [${repo.full_name}](${repo.html_url}) ⭐ ${formatStars(repo.stargazers_count)}`);
      if (repo.description) {
        lines.push(`  - ${repo.description}`);
      }
    });
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(`*最后更新: ${new Date().toLocaleString()}*`);

  return lines.join('\n');
};

const formatStars = (count: number): string => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
};
