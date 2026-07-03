import { ChevronRight, FileText, Folder, FolderOpen, FolderMinus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { BookManifest, ChapterManifest } from "../core/types";

type ChapterListProps = {
  manifest: BookManifest;
  activeChapterId: string;
  onSelectChapter: (chapterId: string) => void;
};

type TreeNode = {
  name: string;
  path: string;
  children: TreeNode[];
  chapter?: ChapterManifest;
};

export function ChapterList({ manifest, activeChapterId, onSelectChapter }: ChapterListProps) {
  const tree = useMemo(() => buildTree(manifest.chapters), [manifest.chapters]);
  const activeChapter = useMemo(
    () => manifest.chapters.find((chapter) => chapter.id === activeChapterId),
    [activeChapterId, manifest.chapters],
  );
  const defaultOpen = useMemo(() => collectParentFolderPaths(activeChapter?.src), [activeChapter?.src]);
  const [openFolders, setOpenFolders] = useState<Set<string>>(() => new Set(defaultOpen));

  useEffect(() => {
    setOpenFolders((current) => new Set([...current, ...defaultOpen]));
  }, [defaultOpen, manifest.id]);

  function toggleFolder(path: string) {
    setOpenFolders((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return (
    <aside className="chapter-list file-tree" aria-label="文档目录">
      <div className="tree-heading">
        <span>DOCUMENT</span>
        {openFolders.size > 0 && (
          <button
            className="tree-action-btn"
            onClick={() => setOpenFolders(new Set())}
            title="全部收起"
            aria-label="全部收起文件夹"
          >
            <FolderMinus size={13} />
          </button>
        )}
      </div>
      <nav>
        {tree.length ? (
          tree.map((node) => (
            <TreeRow
              key={node.path}
              node={node}
              depth={0}
              activeChapterId={activeChapterId}
              openFolders={openFolders}
              onToggleFolder={toggleFolder}
              onSelectChapter={onSelectChapter}
            />
          ))
        ) : (
          <p className="muted-panel">没有 Markdown 文件。</p>
        )}
      </nav>
    </aside>
  );
}

function TreeRow({
  node,
  depth,
  activeChapterId,
  openFolders,
  onToggleFolder,
  onSelectChapter,
}: {
  node: TreeNode;
  depth: number;
  activeChapterId: string;
  openFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onSelectChapter: (chapterId: string) => void;
}) {
  const isFolder = node.children.length > 0 && !node.chapter;
  const isOpen = openFolders.has(node.path);
  if (isFolder) {
    return (
      <div>
        <button className="tree-row folder-row" style={{ "--tree-depth": depth } as React.CSSProperties} onClick={() => onToggleFolder(node.path)}>
          <ChevronRight className={isOpen ? "folder-caret open" : "folder-caret"} size={12} />
          {isOpen ? <FolderOpen size={13} /> : <Folder size={13} />}
          <span>{node.name}</span>
        </button>
        {isOpen
          ? node.children.map((child) => (
              <TreeRow
                key={child.path}
                node={child}
                depth={depth + 1}
                activeChapterId={activeChapterId}
                openFolders={openFolders}
                onToggleFolder={onToggleFolder}
                onSelectChapter={onSelectChapter}
              />
            ))
          : null}
      </div>
    );
  }

  if (!node.chapter) return null;
  return (
    <button
      className={node.chapter.id === activeChapterId ? "tree-row file-row active" : "tree-row file-row"}
      style={{ "--tree-depth": depth } as React.CSSProperties}
      onClick={() => onSelectChapter(node.chapter!.id)}
      title={node.chapter.src}
    >
      <FileText size={13} />
      <span>{fileLabel(node.name)}</span>
    </button>
  );
}

function buildTree(chapters: ChapterManifest[]): TreeNode[] {
  const root: TreeNode = { name: "root", path: "", children: [] };
  for (const chapter of chapters) {
    const parts = chapter.src.split("/").filter(Boolean);
    let current = root;
    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join("/");
      let child = current.children.find((item) => item.path === path);
      if (!child) {
        child = { name: part, path, children: [] };
        current.children.push(child);
      }
      if (index === parts.length - 1) child.chapter = chapter;
      current = child;
    });
  }
  sortNodes(root.children);
  return root.children;
}

function sortNodes(nodes: TreeNode[]): void {
  nodes.sort((a, b) => {
    const aFolder = a.children.length > 0 && !a.chapter;
    const bFolder = b.children.length > 0 && !b.chapter;
    if (aFolder !== bFolder) return aFolder ? -1 : 1;
    return a.name.localeCompare(b.name, "zh-Hans-CN", { numeric: true });
  });
  nodes.forEach((node) => sortNodes(node.children));
}

function collectParentFolderPaths(src?: string): string[] {
  if (!src) return [];
  const parts = src.split("/").filter(Boolean);
  const paths: string[] = [];
  for (let index = 1; index < parts.length; index += 1) {
    paths.push(parts.slice(0, index).join("/"));
  }
  return paths;
}

function fileLabel(name: string): string {
  return name.replace(/\.(md|markdown)$/i, ".md");
}
