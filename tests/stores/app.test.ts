/**
 * Zustand Store 单元测试示例
 * 演示如何为 store 编写测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../src/stores/app';

describe('AppStore', () => {
  beforeEach(() => {
    // 重置 store 状态
    useAppStore.setState({
      isAuthenticated: false,
      user: null,
      stars: [],
      labels: [],
      repos: {},
      selectedRepos: [],
      batchMode: false,
    });
  });

  describe('addLabel', () => {
    it('should add a new label', () => {
      const { addLabel, labels } = useAppStore.getState();

      addLabel('Test Label', '#FF0000', 'custom');

      const updatedLabels = useAppStore.getState().labels;
      expect(updatedLabels).toHaveLength(1);
      expect(updatedLabels[0].name).toBe('Test Label');
      expect(updatedLabels[0].color).toBe('#FF0000');
      expect(updatedLabels[0].type).toBe('custom');
    });

    it('should generate unique IDs for labels', () => {
      const { addLabel } = useAppStore.getState();

      addLabel('Label 1', '#FF0000', 'custom');
      addLabel('Label 2', '#00FF00', 'custom');

      const labels = useAppStore.getState().labels;
      expect(labels[0].id).not.toBe(labels[1].id);
    });
  });

  describe('findOrCreateLabelByName', () => {
    it('should return existing label ID if label exists', () => {
      const { addLabel, findOrCreateLabelByName } = useAppStore.getState();

      addLabel('Existing Label', '#FF0000', 'custom');
      const existingLabels = useAppStore.getState().labels;
      const existingId = existingLabels[0].id;

      const foundId = findOrCreateLabelByName('Existing Label', 'custom');

      expect(foundId).toBe(existingId);
    });

    it('should create new label if not exists', () => {
      const { findOrCreateLabelByName, labels } = useAppStore.getState();

      const newId = findOrCreateLabelByName('New Label', 'generated');

      const updatedLabels = useAppStore.getState().labels;
      expect(updatedLabels).toHaveLength(1);
      expect(updatedLabels[0].id).toBe(newId);
      expect(updatedLabels[0].name).toBe('New Label');
      expect(updatedLabels[0].type).toBe('generated');
    });

    it('should create label with random color', () => {
      const { findOrCreateLabelByName } = useAppStore.getState();

      findOrCreateLabelByName('Label 1', 'custom');
      findOrCreateLabelByName('Label 2', 'custom');

      const labels = useAppStore.getState().labels;
      // 颜色应该是预定义的颜色之一
      const validColors = [
        '#0052D9', '#2BA47D', '#E37318', '#E34D59', '#ED7B2F',
        '#8E4EC6', '#0594FA', '#29B4BA', '#C45F9E', '#6E5FAD'
      ];
      expect(validColors).toContain(labels[0].color);
      expect(validColors).toContain(labels[1].color);
    });
  });

  describe('setRepoLabels', () => {
    it('should set labels for a repository', () => {
      const { addLabel, setRepoLabels, repos } = useAppStore.getState();

      addLabel('Label 1', '#FF0000', 'custom');
      addLabel('Label 2', '#00FF00', 'custom');

      const labels = useAppStore.getState().labels;
      const labelIds = labels.map(l => l.id);

      setRepoLabels('owner/repo', labelIds, 'custom');

      const updatedRepos = useAppStore.getState().repos;
      expect(updatedRepos['owner/repo']).toBeDefined();
      expect(updatedRepos['owner/repo'].customLabels).toEqual(labelIds);
    });

    it('should merge labels when setting different types', () => {
      const { addLabel, setRepoLabels, repos } = useAppStore.getState();

      addLabel('Custom Label', '#FF0000', 'custom');
      addLabel('Generated Label', '#00FF00', 'generated');

      const labels = useAppStore.getState().labels;
      const customLabelId = labels[0].id;
      const generatedLabelId = labels[1].id;

      setRepoLabels('owner/repo', [customLabelId], 'custom');
      setRepoLabels('owner/repo', [generatedLabelId], 'generated');

      const updatedRepos = useAppStore.getState().repos;
      expect(updatedRepos['owner/repo'].customLabels).toEqual([customLabelId]);
      expect(updatedRepos['owner/repo'].generatedLabels).toEqual([generatedLabelId]);
    });
  });

  describe('batch operations', () => {
    it('should toggle batch mode', () => {
      const { toggleBatchMode } = useAppStore.getState();

      expect(useAppStore.getState().batchMode).toBe(false);

      toggleBatchMode();
      expect(useAppStore.getState().batchMode).toBe(true);

      toggleBatchMode();
      expect(useAppStore.getState().batchMode).toBe(false);
    });

    it('should select all repos', () => {
      const { selectAllRepos } = useAppStore.getState();

      selectAllRepos(['repo1', 'repo2', 'repo3']);

      expect(useAppStore.getState().selectedRepos).toEqual(['repo1', 'repo2', 'repo3']);
    });

    it('should clear selection', () => {
      const { selectAllRepos, clearSelection } = useAppStore.getState();

      selectAllRepos(['repo1', 'repo2', 'repo3']);
      expect(useAppStore.getState().selectedRepos).toHaveLength(3);

      clearSelection();
      expect(useAppStore.getState().selectedRepos).toHaveLength(0);
    });
  });
});
