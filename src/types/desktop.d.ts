import type { BookManifest, ChapterSource } from "../core/types";

export type DirectoryOpenResult =
  | { canceled: true }
  | {
      canceled: false;
      directory: BookManifest & {
        rootPath: string;
      };
    };

declare global {
  interface Window {
    bookMDDesktop?: {
      getLaunchFilePath: () => Promise<string | null>;
      setNativeTheme: (theme: string) => Promise<void>;
      openDirectory: () => Promise<DirectoryOpenResult>;
      readMarkdownFile: (absolutePath: string) => Promise<ChapterSource>;
      getDirectoryForFile: (absolutePath: string) => Promise<{
        directory: BookManifest & { rootPath: string };
        activeChapterId: string | null;
      }>;
      onOpenFilePath: (callback: (absolutePath: string) => void) => () => void;
    };
  }
}

export {};
