import { GitHubRepo } from '../../types';

export interface AutoTaggerProps {
  visible: boolean;
  onClose: () => void;
}

export interface RepoTagStats {
  withCustomTags: number;
  withGeneratedTags: number;
  withoutTags: number;
}

export interface GeneratingProgress {
  current: number;
  total: number;
}

export interface ConfigStepProps {
  repoTagStats: RepoTagStats;
  stars: GitHubRepo[];
  selectedRepos: string[];
  onSelectionChange: (repos: string[]) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onCancel: () => void;
}

export interface GeneratingStepProps {
  progress: GeneratingProgress;
}

export interface ConfirmStepProps {
  pendingChanges: PendingTagChange[];
  selectedChanges: string[];
  onSelectionChange: (changes: string[]) => void;
  onApply: () => void;
  onReselect: () => void;
  onCancel: () => void;
  isApplying: boolean;
}

// 从 stores/app.ts 导入的类型
export interface PendingTagChange {
  repoFullName: string;
  repoName: string;
  description: string | null;
  language: string | null;
  suggestedTags: string[];
  currentLabelIds: string[];
}
