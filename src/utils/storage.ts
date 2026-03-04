import { StorageData } from '../types';

const STORAGE_KEY = 'github_star_manager';

const defaultData: StorageData = {
  token: '',
  username: '',
  labels: [],
  repos: {},
  syncRepo: '',
};

export const getStorageData = (): StorageData => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    return { ...defaultData, ...JSON.parse(data) };
  }
  return defaultData;
};

export const saveStorageData = (data: Partial<StorageData>): void => {
  const current = getStorageData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...data }));
};

export const generateId = (): string => {
  return `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
