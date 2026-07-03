import { Search } from "lucide-react";
import type { SearchResult } from "../core/types";

type SearchPanelProps = {
  query: string;
  results: SearchResult[];
  onQueryChange: (query: string) => void;
  onJump: (result: SearchResult) => void;
};

export function SearchPanel({ query, results, onQueryChange, onJump }: SearchPanelProps) {
  return (
    <div className="search-panel">
      <label className="search-box">
        <Search size={16} />
        <input
          aria-label="搜索当前章节"
          data-search-input
          placeholder="搜索当前章节"
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
        />
      </label>
      <div className="search-results">
        {query && results.length === 0 ? <p className="muted-panel">没有匹配结果。</p> : null}
        {results.map((result) => (
          <button className="search-result" key={`${result.index}-${result.excerpt}`} onClick={() => onJump(result)}>
            <strong>{result.title}</strong>
            <span>{result.excerpt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
