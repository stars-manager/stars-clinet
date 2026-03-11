export interface GitHubUser {
  login: string;          // 用户名
  id: number;             // 用户 ID
  avatar_url: string;     // 头像 URL
  name?: string;          // 用户显示名称（可选）
}

export interface GitHubRepo {
  id: number;                  // 仓库 ID
  name: string;                // 仓库名称
  full_name: string;           // 完整仓库名 (owner/repo)
  description: string | null;  // 仓库描述
  html_url: string;            // 仓库 GitHub 页面 URL
  stargazers_count: number;    // Star 数量
  language: string | null;     // 主要编程语言
  updated_at: string;          // 最后更新时间
  owner: {
    login: string;             // 仓库所有者用户名
    avatar_url: string;        // 仓库所有者头像
  };
}

export interface Label {
  id: string;             // 标签唯一标识
  name: string;           // 标签名称
  color: string;          // 标签颜色 (十六进制)
  type: 'custom' | 'generated';  // 标签类型：custom=个人自定义，generated=AI生成
}

export interface RepoInfo {
  labels: string[];           // 该仓库关联的标签 ID 数组
  description: string | null; // 仓库简介（从 GitHub 同步）
  language: string | null;    // 仓库主要语言（从 GitHub 同步）
  remark?: string;            // 备注
}

export interface Repos {
  [repoFullName: string]: RepoInfo;  // 以 "owner/repo" 为键的仓库信息映射
}

export interface StorageData {
  token: string;       // GitHub Personal Access Token
  username: string;    // GitHub 用户名
  labels: Label[];     // 所有标签列表
  repos: Repos;        // 仓库信息映射（包含标签关联、简介、语言）
  syncRepo: string;    // 当前选择的同步仓库
}
