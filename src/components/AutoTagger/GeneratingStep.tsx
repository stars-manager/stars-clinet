import React from 'react';
import { Loading } from 'tdesign-react';
import { GeneratingStepProps } from './types';

export const GeneratingStep: React.FC<GeneratingStepProps> = ({ progress }) => {
  return (
    <div style={{ padding: '40px 0', textAlign: 'center' }}>
      <Loading text="正在生成标签..." />
      <div style={{ marginTop: '16px', color: '#666' }}>
        已处理 {Math.min(progress.current, progress.total)} / {progress.total} 个项目
      </div>
      <div style={{
        marginTop: '12px',
        width: '300px',
        height: '8px',
        background: '#f5f5f5',
        borderRadius: '4px',
        margin: '12px auto'
      }}>
        <div style={{
          width: `${(progress.current / progress.total) * 100}%`,
          height: '100%',
          background: '#0052D9',
          borderRadius: '4px',
          transition: 'width 0.3s'
        }} />
      </div>
    </div>
  );
};
