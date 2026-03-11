// React 状态管理示例 - 使用 useReducer

import React, { useReducer, createContext, useContext } from 'react';

// 定义状态类型
type AppState = {
  stars: any[];
  labels: any[];
  selectedRepos: string[];
  searchKeyword: string;
  step: 'config' | 'generating' | 'confirm';
};

// 定义 Action 类型
type Action =
  | { type: 'SET_STARS'; payload: any[] }
  | { type: 'SET_LABELS'; payload: any[] }
  | { type: 'SET_SELECTED'; payload: string[] }
  | { type: 'SET_KEYWORD'; payload: string }
  | { type: 'SET_STEP'; payload: 'config' | 'generating' | 'confirm' }
  | { type: 'RESET' };

// 初始状态
const initialState: AppState = {
  stars: [],
  labels: [],
  selectedRepos: [],
  searchKeyword: '',
  step: 'config',
};

// Reducer 函数
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_STARS':
      return { ...state, stars: action.payload };
    case 'SET_LABELS':
      return { ...state, labels: action.payload };
    case 'SET_SELECTED':
      return { ...state, selectedRepos: action.payload };
    case 'SET_KEYWORD':
      return { ...state, searchKeyword: action.payload };
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// 创建 Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

// Provider 组件
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
};

// 自定义 Hook
export const useAppState = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
};

// 使用示例：
/*
function MyComponent() {
  const { state, dispatch } = useAppState();

  const handleSetStars = (stars: any[]) => {
    dispatch({ type: 'SET_STARS', payload: stars });
  };

  return (
    <div>
      <p>Stars: {state.stars.length}</p>
      <button onClick={() => handleSetStars([])}>Clear Stars</button>
    </div>
  );
}
*/
