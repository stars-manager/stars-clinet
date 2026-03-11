import React, { useState } from 'react';
import { Button, Dialog, Input } from 'tdesign-react';
import { useAppStore } from '../stores/app';

interface AutoTaggerConfigProps {
  visible: boolean;
  onClose: () => void;
}

// 每批次处理的项目数（后端限制 20 个）
// const BATCH_SIZE = 20;

export const AutoTaggerConfig: React.FC<AutoTaggerConfigProps> = ({ visible, onClose }) => {
  const { stars, getRepoLabels } = useAppStore();

  // 状态
  const [searchKeyword, setSearchKeyword] = useState('');

  // 获取未设置标签的项目
  const untaggedRepos = (stars || []).filter(repo => {
    const repoLabels = getRepoLabels(repo.full_name);
    return repoLabels.length === 0;
  });

  // 过滤后的未设置标签项目
  // const filteredUntaggedRepos = (untaggedRepos || []).filter(repo =>
  //   repo.full_name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
  //   repo.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
  //   (repo.description && repo.description.toLowerCase().includes(searchKeyword.toLowerCase())) ||
  //   (repo.language && repo.language.toLowerCase().includes(searchKeyword.toLowerCase()))
  // );

  return (
    <Dialog
      header="选择项目"
      visible={visible}
      onClose={onClose}
      width="800px"
      footer={null}
    >
      <div style={{ padding: '12px' }}>
        <Input
          placeholder="搜索项目名称、描述或语言..."
          value={searchKeyword}
          onChange={setSearchKeyword}
          clearable
        />
        
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          marginTop: '16px'
        }}>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button theme="primary" disabled={untaggedRepos.length === 0}>
            开始生成标签 ({untaggedRepos.length})
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
