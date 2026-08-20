import { Search, X, Hash } from "lucide-react";
import type { SearchResult } from "../core/types";

type SearchPanelProps = {
  query: string;
  results: SearchResult[];
  activeResultId?: string | null;
  onQueryChange: (query: string) => void;
  onJump: (result: SearchResult) => void;
};

function renderHighlightedText(text: string, query: string) {
  if (!query || !query.trim()) return text;
  const q = query.trim();
  const qLower = q.toLowerCase();
  const textLower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;

  while (lastIndex < text.length) {
    const idx = textLower.indexOf(qLower, lastIndex);
    if (idx === -1) {
      parts.push(text.slice(lastIndex));
      break;
    }
    if (idx > lastIndex) {
      parts.push(text.slice(lastIndex, idx));
    }
    parts.push(
      <mark key={`match-${matchIndex++}`} className="search-excerpt-match">
        {text.slice(idx, idx + q.length)}
      </mark>
    );
    lastIndex = idx + q.length;
  }

  return parts;
}

export function SearchPanel({
  query,
  results,
  activeResultId,
  onQueryChange,
  onJump,
}: SearchPanelProps) {
  return (
    <div className="search-panel">
      <label className="search-box">
        <Search size={15} className="search-box-icon" />
        <input
          aria-label="搜索当前章节内容"
          data-search-input
          placeholder="搜索章节关键字..."
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
        />
        {query ? (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => onQueryChange("")}
            title="清空搜索"
            aria-label="清空"
          >
            <X size={13} />
          </button>
        ) : null}
      </label>

      {query.trim() && results.length > 0 ? (
        <div className="search-count-badge">
          <span>共找到 {results.length} 处匹配</span>
        </div>
      ) : null}

      <div className="search-results">
        {query.trim() && results.length === 0 ? (
          <p className="muted-panel">没有找到匹配内容</p>
        ) : null}
        {results.map((result, idx) => {
          const resultId = result.id ?? `res-${idx}-${result.index}`;
          const isActive = activeResultId === resultId;

          return (
            <button
              type="button"
              className={`search-result ${isActive ? "active" : ""}`}
              key={resultId}
              onClick={() => onJump(result)}
            >
              <div className="search-result-header">
                <strong>{result.title}</strong>
                <div className="search-result-meta-row">
                  {result.matchCountInBlock && result.matchCountInBlock > 1 ? (
                    <span className="search-block-count-tag" title={`该文段中包含 ${result.matchCountInBlock} 处匹配`}>
                      {result.matchCountInBlock} 处匹配
                    </span>
                  ) : null}
                  {result.lineNumber ? (
                    <span className="search-line-tag">
                      <Hash size={10} style={{ marginRight: 2 }} />
                      L{result.lineNumber}{result.lineEndNumber && result.lineEndNumber > result.lineNumber ? `-${result.lineEndNumber}` : ""}
                    </span>
                  ) : null}
                </div>
              </div>
              <span className="search-result-excerpt">
                {renderHighlightedText(result.excerpt, query)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
