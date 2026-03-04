import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GitHubRepo, Label, Repos } from '../types';
import { verifyToken, fetchAllStars, getFile, createOrUpdateFile, getFileContent } from '../api/github';
import { generateId } from '../utils/storage';
import { generateReadme, generateJson } from '../utils/markdown';
import { mergeStarsData, parseSyncData, MergeStats } from '../utils/dataMerge';

interface AppState {
  // State
  token: string;
  username: string;
  user: { login: string; avatar_url: string } | null;
  stars: GitHubRepo[];
  loadingStars: boolean;
  labels: Label[];
  repos: Repos;
  syncRepo: string;
  showFetchStarsModal: boolean;
  activeTab: 'stars' | 'labels';
  syncing: boolean;

  // Actions
  setToken: (token: string) => Promise<void>;
  fetchStars: () => Promise<MergeStats | void>;
  addLabel: (name: string, color: string) => void;
  updateLabel: (id: string, name: string, color: string) => void;
  deleteLabel: (id: string) => void;
  setRepoLabels: (repoFullName: string, labelIds: string[]) => void;
  getRepoLabels: (repoFullName: string) => string[];
  setRepoRemark: (repoFullName: string, remark: string) => void;
  getRepoRemark: (repoFullName: string) => string;
  setSyncRepo: (repo: string) => void;
  setShowFetchStarsModal: (show: boolean) => void;
  setActiveTab: (tab: 'stars' | 'labels') => void;
  syncToRepo: () => Promise<void>;
  logout: () => void;
}

const stateCreator: StateCreator<AppState> = (set, get) => ({
  // Initial State
  token: '',
  username: '',
  user: null,
  stars: [],
  loadingStars: false,
  labels: [],
  repos: {},
  syncRepo: '',
  showFetchStarsModal: false,
  activeTab: 'stars',
  syncing: false,

  // Actions
  setToken: async (newToken: string) => {
    const userData = await verifyToken(newToken);
    set({
      token: newToken,
      username: userData.login,
      user: { login: userData.login, avatar_url: userData.avatar_url },
    });
  },

  fetchStars: async () => {
    const { token, username, repos, labels, syncRepo } = get();
    if (!token || !username) return;

    set({ loadingStars: true });
    try {
      // 1. 从 GitHub API 获取最新 Stars
      const allStars = await fetchAllStars(token, username);
      
      // 2. 如果配置了同步仓库，尝试从仓库读取 JSON 数据
      let localRepos = repos;
      let localLabels = labels;
      
      if (syncRepo) {
        try {
          const [owner, repo] = syncRepo.split('/');
          const fileData = await getFileContent(token, owner, repo, 'stars.json');
          
          if (fileData) {
            const syncData = parseSyncData(fileData.content);
            
            if (syncData) {
              // 使用远程数据作为本地数据
              if (syncData.repos) {
                localRepos = syncData.repos;
              }
              if (syncData.labels) {
                localLabels = syncData.labels;
              }
            }
          }
        } catch (error) {
          // 如果读取失败，继续使用本地数据
          console.warn('Failed to read sync data from repo:', error);
        }
      }
      
      // 3. 合并 GitHub Stars 和本地数据
      const mergeResult = mergeStarsData(allStars, localRepos, localLabels);
      
      // 4. 更新状态
      set({ 
        stars: mergeResult.stars, 
        repos: mergeResult.repos,
        labels: mergeResult.labels,
      });
      
      // 5. 返回合并统计信息
      return mergeResult.stats;
    } finally {
      set({ loadingStars: false });
    }
  },

  addLabel: (name: string, color: string) => {
    const newLabel: Label = { id: generateId(), name, color };
    set((state) => ({
      labels: [...state.labels, newLabel],
    }));
  },

  updateLabel: (id: string, name: string, color: string) => {
    set((state) => ({
      labels: state.labels.map((l) =>
        l.id === id ? { ...l, name, color } : l
      ),
    }));
  },

  deleteLabel: (id: string) => {
    set((state) => {
      const newRepos: Repos = {};
      Object.entries(state.repos).forEach(([repoFullName, repoInfo]) => {
        newRepos[repoFullName] = {
          ...repoInfo,
          labels: repoInfo.labels.filter((labelId) => labelId !== id),
        };
      });
      return {
        labels: state.labels.filter((l) => l.id !== id),
        repos: newRepos,
      };
    });
  },

  setRepoLabels: (repoFullName: string, labelIds: string[]) => {
    set((state) => ({
      repos: {
        ...state.repos,
        [repoFullName]: {
          ...state.repos[repoFullName],
          labels: labelIds,
        },
      },
    }));
  },

  getRepoLabels: (repoFullName: string) => {
    return get().repos[repoFullName]?.labels || [];
  },

  setRepoRemark: (repoFullName: string, remark: string) => {
    set((state) => ({
      repos: {
        ...state.repos,
        [repoFullName]: {
          ...state.repos[repoFullName],
          remark,
        },
      },
    }));
  },

  getRepoRemark: (repoFullName: string) => {
    return get().repos[repoFullName]?.remark || '';
  },

  setSyncRepo: (repo: string) => {
    set({ syncRepo: repo });
  },

  setShowFetchStarsModal: (show: boolean) => {
    set({ showFetchStarsModal: show });
  },

  setActiveTab: (tab: 'stars' | 'labels') => {
    set({ activeTab: tab });
  },

  syncToRepo: async () => {
    const { token, syncRepo, stars, labels, repos } = get();
    
    if (!token) {
      throw new Error('请先设置 Token');
    }
    
    if (!syncRepo) {
      throw new Error('请先选择同步仓库');
    }
    
    if (stars.length === 0) {
      throw new Error('暂无 Stars 数据可同步');
    }
    
    set({ syncing: true });
    
    try {
      const [owner, repo] = syncRepo.split('/');
      const timestamp = new Date().toLocaleString('zh-CN');
      
      const jsonContent = generateJson(stars, labels, repos);
      
      const existingJson = await getFile(token, owner, repo, 'stars.json');
      const jsonSha = existingJson?.sha;
      
      await createOrUpdateFile(
        token,
        owner,
        repo,
        'stars.json',
        jsonContent,
        `Update data: ${timestamp}`,
        jsonSha
      );
      
      const readmeContent = generateReadme(stars, labels, repos);
      
      const existingReadme = await getFile(token, owner, repo, 'README.md');
      const readmeSha = existingReadme?.sha;
      
      await createOrUpdateFile(
        token,
        owner,
        repo,
        'README.md',
        readmeContent,
        `Update README: ${timestamp}`,
        readmeSha
      );
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(err.message || '推送失败，请检查网络或 Token 权限');
    } finally {
      set({ syncing: false });
    }
  },

  logout: () => {
    set({ token: '', username: '', user: null, stars: [] });
  },
});

// 使用类型断言解决 zustand persist 与 TypeScript strict mode 的兼容性问题
const persistedCreator = persist(stateCreator, {
  name: 'github-star-manager',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    token: state.token,
    username: state.username,
    user: state.user,
    labels: state.labels,
    repos: state.repos,
    stars: state.stars,
    syncRepo: state.syncRepo,
  }),
});

export const useAppStore = create<AppState>()(persistedCreator as StateCreator<AppState>);
