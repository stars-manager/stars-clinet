// GitHub API 代理调用
// 所有请求通过后端代理，不再直接调用 GitHub API

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  topics?: string[];
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface RepoInfo {
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
}

export interface FileContent {
  name: string;
  path: string;
  sha: string;
  content?: string;
  download_url?: string;
}

// 通用请求函数
async function request(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // 携带 Cookie
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '请求失败' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response;
}

// 获取用户仓库列表
export async function getUserRepos(): Promise<RepoInfo[]> {
  const response = await request('/api/v1/github/user/repos?per_page=100&sort=updated');
  const data = await response.json();
  return data.data; // 后端返回格式: { code: 0, data: [...] }
}

// 创建仓库
export async function createRepo(name: string, isPrivate: boolean = true): Promise<RepoInfo> {
  const response = await request('/api/v1/github/user/repos', {
    method: 'POST',
    body: JSON.stringify({
      name,
      private: isPrivate,
      description: 'GitHub Star Manager 同步数据',
    }),
  });

  const data = await response.json();
  return data.data;
}

// 获取用户 Stars 列表（分页）
export async function fetchAllStars(username: string): Promise<GitHubRepo[]> {
  const stars: GitHubRepo[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await request(
      `/api/v1/github/user/starred?username=${username}&page=${page}&per_page=${perPage}`
    );
    const data = await response.json();
    const repos = data.data;

    if (!repos || repos.length === 0) break;

    stars.push(...repos);
    page++;

    // 防止请求过多
    if (page > 10) break;
  }

  return stars;
}

// 获取文件
export async function getFile(
  owner: string,
  repo: string,
  path: string
): Promise<FileContent | null> {
  const response = await request(
    `/api/v1/github/repos/${owner}/${repo}/contents/${path}`
  );

  const data = await response.json();
  return data.data;
}

// 获取文件内容（解码 base64）
export async function getFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<{ content: string; sha: string } | null> {
  const response = await request(
    `/api/v1/github/repos/${owner}/${repo}/contents/${path}/decoded`
  );

  const data = await response.json();
  return data.data;
}

// 创建或更新文件
export async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<void> {
  await request(`/api/v1/github/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content,
      sha,
    }),
  });
}
