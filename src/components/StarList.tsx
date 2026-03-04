import React, { useState, useMemo } from "react";
import Input from "tdesign-react/es/input";
import Select from "tdesign-react/es/select";
import Space from "tdesign-react/es/space";
import Loading from "tdesign-react/es/loading";
import "tdesign-react/es/input/style/css.js";
import "tdesign-react/es/select/style/css.js";
import "tdesign-react/es/space/style/css.js";
import "tdesign-react/es/loading/style/css.js";
import { useAppStore } from "../stores/app";
import { StarCard } from "./StarCard";
import { LabelSelect, NO_LABEL_ID } from "./LabelSelect";

type SortBy = "updated" | "name" | "stars";

export const StarList: React.FC = () => {
  const { stars, loadingStars, labels, repos } = useAppStore();
  const [search, setSearch] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortBy>("updated");

  const filteredStars = useMemo(() => {
    let result = [...stars];

    // 标签筛选
    if (selectedLabels.length > 0) {
      const hasNoLabel = selectedLabels.includes(NO_LABEL_ID);
      const regularLabelIds = selectedLabels.filter((id) => id !== NO_LABEL_ID);

      result = result.filter((repo) => {
        const repoLabelIds = repos[repo.full_name]?.labels || [];

        // 如果选择了"未设标签"
        if (hasNoLabel) {
          // 只显示未设标签的仓库
          if (repoLabelIds.length > 0) {
            return false;
          }
          return true;
        }

        // 普通标签筛选（必须包含所有选中的标签）
        if (regularLabelIds.length > 0) {
          return regularLabelIds.every((labelId) =>
            repoLabelIds.includes(labelId)
          );
        }

        return true;
      });
    }

    // 语言筛选
    if (selectedLanguage) {
      result = result.filter((repo) => repo.language === selectedLanguage);
    }

    // 搜索筛选（搜索仓库名和介绍）
    if (search) {
      const keyword = search.toLowerCase();
      result = result.filter((repo) => {
        return (
          repo.full_name.toLowerCase().includes(keyword) ||
          repo.description?.toLowerCase().includes(keyword)
        );
      });
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.full_name.localeCompare(b.full_name);
        case "stars":
          return b.stargazers_count - a.stargazers_count;
        case "updated":
        default:
          return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
      }
    });

    return result;
  }, [stars, search, selectedLabels, selectedLanguage, sortBy, repos]);

  // 提取所有语言并生成选项
  const languageOptions = useMemo(() => {
    const languages = new Set<string>();
    stars.forEach((repo) => {
      if (repo.language) {
        languages.add(repo.language);
      }
    });
    return Array.from(languages)
      .sort()
      .map((lang) => ({ label: lang, value: lang }));
  }, [stars]);

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        {/* 第一行：筛选和排序 */}
        <div
          style={{
            marginBottom: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Space>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", color: "#666", width: "60px", display: "inline-block", textAlign: "right" }}>
                排序：
              </span>
              <Select
                value={sortBy}
                onChange={(value) => setSortBy(value as SortBy)}
                style={{ width: "120px" }}
                options={[
                  { label: "最近更新", value: "updated" },
                  { label: "名称", value: "name" },
                  { label: "星标数", value: "stars" },
                ]}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", color: "#666", width: "60px", display: "inline-block", textAlign: "right" }}>
                标签：
              </span>
              <LabelSelect
                value={selectedLabels}
                onChange={setSelectedLabels}
                labels={labels}
                placeholder="筛选标签"
                style={{ minWidth: "150px", maxWidth: "400px" }}
                showNoLabelOption={true}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", color: "#666", width: "60px", display: "inline-block", textAlign: "right" }}>
                语言：
              </span>
              <Select
                value={selectedLanguage}
                onChange={(value) => setSelectedLanguage(value as string)}
                placeholder="全部"
                clearable
                style={{ width: "150px" }}
                options={[{ label: "全部", value: "" }, ...languageOptions]}
              />
            </div>
          </Space>
          <span style={{ color: "#666" }}>共 {filteredStars.length} 个</span>
        </div>

        {/* 第二行：搜索 */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", color: "#666", width: "60px", display: "inline-block", textAlign: "right" }}>
            搜索：
          </span>
          <Input
            placeholder="搜索项目..."
            value={search}
            onChange={(value) => setSearch(value)}
            style={{ width: "300px" }}
          />
        </div>
      </div>

      {loadingStars ? (
        <Loading text="加载中..." />
      ) : filteredStars.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
          {stars.length === 0 ? "暂无 Stars，请先同步" : "没有匹配的项目"}
        </div>
      ) : (
        filteredStars.map((repo) => (
          <StarCard key={repo.full_name} repo={repo} />
        ))
      )}
    </div>
  );
};
