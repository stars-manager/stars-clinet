// 认证相关 API

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
}

export interface LoginResponse {
  auth_url: string;
}

// 获取 GitHub OAuth 登录 URL
export async function getLoginURL(): Promise<LoginResponse> {
  const response = await fetch('/api/v1/auth/login', {
    method: 'GET',
    credentials: 'include', // 携带 Cookie
  });

  if (!response.ok) {
    throw new Error(`获取登录 URL 失败: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data; // 后端返回格式: { code: 0, data: { auth_url: "..." } }
}

// 获取当前登录用户信息
export async function getCurrentUser(): Promise<GitHubUser | null> {
  const response = await fetch('/api/v1/auth/user', {
    method: 'GET',
    credentials: 'include',
  });

  if (response.status === 401) {
    // 未登录
    return null;
  }

  if (!response.ok) {
    throw new Error(`获取用户信息失败: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data; // 后端返回格式: { code: 0, data: {...} }
}

// 登出
export async function logout(): Promise<void> {
  const response = await fetch('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`登出失败: ${response.statusText}`);
  }
}
