import { Octokit } from '@octokit/core';
import { GitHubUser, GitHubRepo } from '../types';

let octokit: Octokit | null = null;

export const initOctokit = (token: string): void => {
  octokit = new Octokit({ auth: token });
};

export const getOctokit = (): Octokit | null => octokit;

export const verifyToken = async (token: string): Promise<GitHubUser> => {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error('Token 验证失败');
  }

  return response.json();
};

export const fetchAllStars = async (token: string, username: string): Promise<GitHubRepo[]> => {
  const stars: GitHubRepo[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await fetch(
      `https://api.github.com/users/${username}/starred?page=${page}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`获取 Stars 失败: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.length === 0) break;

    stars.push(...data);
    page++;

    // 防止请求过多
    if (page > 10) break;
  }

  return stars;
};

export interface RepoInfo {
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
}

export const createRepo = async (token: string, name: string, isPrivate: boolean = true): Promise<RepoInfo> => {
  const response = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      private: isPrivate,
      auto_init: true,
      description: 'GitHub Star Manager 同步数据',
    }),
  });

  if (!response.ok) {
    throw new Error(`创建仓库失败: ${response.statusText}`);
  }

  return response.json();
};

export const getUserRepos = async (token: string): Promise<RepoInfo[]> => {
  const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`获取仓库列表失败: ${response.statusText}`);
  }

  return response.json();
};

export interface FileContent {
  name: string;
  path: string;
  sha: string;
  content?: string;
  download_url?: string;
}

export const getFile = async (
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<FileContent | null> => {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`获取文件失败: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
};

/**
 * 获取文件内容（解码 base64）
 */
export const getFileContent = async (
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<{ content: string; sha: string } | null> => {
  const fileData = await getFile(token, owner, repo, path);
  
  if (!fileData || !fileData.content) {
    return null;
  }

  // 解码 base64 内容
  const content = decodeURIComponent(escape(atob(fileData.content)));
  
  return {
    content,
    sha: fileData.sha,
  };
};

export const createOrUpdateFile = async (
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<void> => {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      sha,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`推送文件失败: ${errorData.message || response.statusText}`);
  }
};
