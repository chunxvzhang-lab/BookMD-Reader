import { memo, useCallback, useEffect, useRef, useState } from "react";

export type TabItem = {
  id: string;
  title: string;
  relativePath: string;
  absolutePath?: string;
  isDirty?: boolean;
};

type TabBarProps = {
  tabs: TabItem[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCloseOtherTabs: (tabId: string) => void;
  onCloseRightTabs: (tabId: string) => void;
};

type ContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
  tabId: string;
} | null;

export const TabBar = memo(function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onCloseOtherTabs,
  onCloseRightTabs,
}: TabBarProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const tabListRef = useRef<HTMLDivElement | null>(null);

  // Close context menu on outside click or scroll
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    window.addEventListener("scroll", handleClick, true);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleClick, true);
    };
  }, []);

  // Ensure active tab is scrolled into view
  useEffect(() => {
    if (!tabListRef.current) return;
    const activeEl = tabListRef.current.querySelector(`.tab-item.is-active`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [activeTabId]);

  const handleContextMenu = useCallback((e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      tabId,
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, tabId: string) => {
    if (e.button === 1) {
      // Middle click closes tab
      e.preventDefault();
      onCloseTab(tabId);
    }
  }, [onCloseTab]);

  if (tabs.length === 0) return null;

  return (
    <div className="tab-bar-container" role="tablist" aria-label="文档标签页">
      <div className="tab-bar-list" ref={tabListRef}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              className={`tab-item ${isActive ? "is-active" : ""} ${tab.isDirty ? "is-dirty" : ""}`}
              onClick={() => onSelectTab(tab.id)}
              onMouseDown={(e) => handleMouseDown(e, tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              title={`${tab.title} (${tab.relativePath})`}
            >
              <span className="tab-icon">📄</span>
              <span className="tab-title">{tab.title}</span>
              {tab.isDirty ? <span className="tab-dirty-indicator" title="未保存的修改" /> : null}
              <button
                type="button"
                className="tab-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                title="关闭标签页 (Ctrl+W)"
                aria-label={`关闭 ${tab.title}`}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {contextMenu?.visible ? (
        <div
          className="tab-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              onCloseTab(contextMenu.tabId);
              setContextMenu(null);
            }}
          >
            关闭当前标签页
          </button>
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              onCloseOtherTabs(contextMenu.tabId);
              setContextMenu(null);
            }}
          >
            关闭其他标签页
          </button>
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              onCloseRightTabs(contextMenu.tabId);
              setContextMenu(null);
            }}
          >
            关闭右侧标签页
          </button>
        </div>
      ) : null}
    </div>
  );
});
