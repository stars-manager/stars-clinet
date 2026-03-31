/**
 * 全局配置管理
 * 集中管理所有配置项，避免硬编码
 */

export const config = {
  // API 配置
  api: {
    baseURL: import.meta.env.VITE_API_BASE_URL || '',
    githubBaseURL: 'https://api.github.com',
    serverBaseURL: import.meta.env.VITE_SERVER_BASE_URL || 'http://localhost:8080',
    timeout: 30000, // 30 秒
    maxRetries: 3,
    retryDelay: 1000, // 1 秒
  },

  // GitHub API 配置
  github: {
    maxStarsPerPage: 100,
    maxConcurrentRequests: 5,
  },

  // 自动标签生成配置
  autoTagger: {
    batchSize: 20, // 每批处理的项目数量
    defaultTags: ['未分类'], // 默认标签
  },

  // 会话配置
  session: {
    timeout: 30 * 60 * 1000, // 30 分钟（毫秒）
    maxHistoryMessages: 20, // 最大历史消息数
  },

  // UI 配置
  ui: {
    virtualListHeight: 800, // 虚拟列表高度
    starCardHeight: 200, // Star 卡片估算高度
    maxDescriptionLines: 2, // 描述最大行数
  },

  // 错误消息配置
  messages: {
    errors: {
      networkError: '网络请求失败，请检查网络连接',
      timeoutError: '请求超时，请检查网络连接',
      serverError: '服务器错误，请稍后重试',
      authError: '认证失败，请重新登录',
      notFoundError: '请求的资源不存在',
    },
    warnings: {
      noSelection: '请先选择要操作的项目',
      noStars: '暂无 Stars 数据',
      noTags: '暂无标签数据',
    },
    success: {
      tagsGenerated: '标签生成成功',
      tagsApplied: '已为 {count} 个项目应用标签',
      syncSuccess: '同步成功',
    },
  },
} as const;

// 类型导出
export type Config = typeof config;

// 获取配置项的辅助函数
export function getConfig<K extends keyof Config>(key: K): Config[K] {
  return config[key];
}

// 环境变量验证
export function validateConfig(): void {
  const requiredEnvVars: string[] = [
    // 'VITE_API_BASE_URL', // 可选
    // 'VITE_SERVER_BASE_URL', // 可选
  ];

  const missing = requiredEnvVars.filter(varName => !import.meta.env[varName]);

  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(', ')}`);
  }
}

// 初始化时验证配置
if (import.meta.env.DEV) {
  validateConfig();
}
