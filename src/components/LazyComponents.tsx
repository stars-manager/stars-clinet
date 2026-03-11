import React, { Suspense, lazy } from 'react';
import { Loading } from 'tdesign-react';

// 懒加载组件
export const LazyLabelManager = lazy(() => 
  import('./LabelManager').then(module => ({ default: module.LabelManager }))
);

export const LazyAutoTagger = lazy(() => 
  import('./AutoTagger').then(module => ({ default: module.AutoTagger }))
);

export const LazySyncSettings = lazy(() => 
  import('./SyncSettings').then(module => ({ default: module.SyncSettings }))
);

// 加载组件包装器
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  children, 
  fallback = <Loading text="加载中..." /> 
}) => (
  <Suspense fallback={fallback}>
    {children}
  </Suspense>
);

// 使用示例：
// <LazyWrapper>
//   <LazyLabelManager onClose={handleClose} />
// </LazyWrapper>
