/**
 * 统一 API 客户端
 * 提供超时控制、自动重试、统一错误处理
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number; // 超时时间（毫秒）
  maxRetries?: number; // 最大重试次数
  retryDelay?: number; // 重试延迟（毫秒）
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retryable?: boolean; // 是否可重试
}

export class ApiClient {
  private baseURL: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config: ApiClientConfig) {
    this.baseURL = config.baseURL;
    this.timeout = config.timeout ?? 30000; // 默认 30 秒
    this.maxRetries = config.maxRetries ?? 3; // 默认重试 3 次
    this.retryDelay = config.retryDelay ?? 1000; // 默认延迟 1 秒
  }

  /**
   * 发起请求
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.timeout,
      retryable = true,
    } = options;

    const url = `${this.baseURL}${endpoint}`;
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // 添加认证 token（如果存在）
    const token = localStorage.getItem('github_token');
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    // 重试逻辑
    let lastError: ApiError | null = null;
    const maxAttempts = retryable ? this.maxRetries + 1 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // 创建超时控制器
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 检查 HTTP 状态码
        if (!response.ok) {
          const errorData = await this.parseErrorResponse(response);
          throw new ApiError(
            errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            errorData.code || 'HTTP_ERROR',
            response.status,
            this.isRetryableStatus(response.status)
          );
        }

        // 解析响应
        const data = await response.json();
        return data as T;
      } catch (error) {
        if (error instanceof ApiError) {
          lastError = error;
          // 如果不可重试或已达最大重试次数，抛出错误
          if (!error.retryable || attempt === maxAttempts) {
            throw error;
          }
        } else if (error instanceof Error) {
          // 处理 AbortError（超时）
          if (error.name === 'AbortError') {
            lastError = new ApiError(
              '请求超时，请检查网络连接',
              'TIMEOUT_ERROR',
              undefined,
              true
            );
          } else {
            lastError = new ApiError(
              error.message || '网络请求失败',
              'NETWORK_ERROR',
              undefined,
              true
            );
          }

          // 如果已达最大重试次数，抛出错误
          if (attempt === maxAttempts) {
            throw lastError;
          }
        }

        // 延迟重试
        if (attempt < maxAttempts) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    throw lastError || new ApiError('未知错误', 'UNKNOWN_ERROR');
  }

  /**
   * 解析错误响应
   */
  private async parseErrorResponse(response: Response): Promise<{ message: string; code?: string }> {
    try {
      const data = await response.json();
      return {
        message: data.message || data.error || '请求失败',
        code: data.code || data.error_code,
      };
    } catch {
      return {
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  }

  /**
   * 判断 HTTP 状态码是否可重试
   */
  private isRetryableStatus(status: number): boolean {
    // 5xx 服务器错误和 429 请求过多可以重试
    return status >= 500 || status === 429;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * GET 请求
   */
  async get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST 请求
   */
  async post<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT 请求
   */
  async put<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE 请求
   */
  async delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH 请求
   */
  async patch<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }
}

// 创建默认实例
export const defaultApiClient = new ApiClient({
  baseURL: '',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
});

// 创建 GitHub API 客户端
export const githubApiClient = new ApiClient({
  baseURL: 'https://api.github.com',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
});

// 创建后端服务 API 客户端
export const serverApiClient = new ApiClient({
  baseURL: 'http://localhost:8080',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
});
