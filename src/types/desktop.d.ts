import type { BookManifest, ChapterManifest, ChapterSource, DiskVersion } from "../core/types";

export type DirectoryOpenResult =
  | { canceled: true }
  | {
      canceled: false;
      directory: BookManifest & {
        rootPath: string;
      };
    };

export type SaveMarkdownRequest = {
  absolutePath: string;
  content: string;
  expectedVersion?: DiskVersion | null;
  force?: boolean;
  hasBom?: boolean;
  lineEnding?: string;
};

export type SaveMarkdownResult =
  | {
      success: true;
      absolutePath: string;
      baseUrl: string;
      diskVersion: DiskVersion;
      cacheKey: string;
    }
  | {
      success: false;
      errorCode: "INVALID_PATH" | "INVALID_EXTENSION" | "FILE_CONFLICT" | "ACCESS_DENIED" | "WRITE_FAILED" | string;
      message: string;
      diskVersion?: DiskVersion;
    };

export type CreateMarkdownOptions = {
  rootPath?: string;
  defaultName?: string;
  initialContent?: string;
};

export type CreateMarkdownResult =
  | { canceled: true }
  | {
      canceled: false;
      success: true;
      absolutePath: string;
      source: ChapterSource;
      chapter: ChapterManifest;
    }
  | {
      canceled: false;
      success: false;
      errorCode: string;
      message: string;
    };

export type SaveMarkdownAsRequest = {
  currentPath?: string;
  content?: string;
};

export type SaveMarkdownAsResult =
  | { canceled: true }
  | {
      canceled: false;
      success: true;
      absolutePath: string;
      baseUrl: string;
      diskVersion: DiskVersion;
      cacheKey: string;
    }
  | {
      canceled: false;
      success: false;
      errorCode: string;
      message: string;
    };

export type BeforeCloseData = {
  requestId: number;
};

declare global {
  interface Window {
    bookMDDesktop?: {
      getLaunchFilePath: () => Promise<string | null>;
      setNativeTheme: (theme: string) => Promise<void>;
      openDirectory: () => Promise<DirectoryOpenResult>;
      refreshDirectory: (rootPath: string) => Promise<BookManifest & { rootPath: string }>;
      readMarkdownFile: (absolutePath: string) => Promise<ChapterSource>;
      getDirectoryForFile: (absolutePath: string) => Promise<{
        directory: BookManifest & { rootPath: string };
        activeChapterId: string | null;
      }>;
      saveMarkdownFile: (request: SaveMarkdownRequest) => Promise<SaveMarkdownResult>;
      createMarkdownFile: (options?: CreateMarkdownOptions) => Promise<CreateMarkdownResult>;
      saveMarkdownFileAs: (request?: SaveMarkdownAsRequest) => Promise<SaveMarkdownAsResult>;
      setDocumentState: (state: { activePath: string | null; isDirty: boolean }) => Promise<void>;
      resolveBeforeClose: (result: { requestId: number; action: "proceed" | "cancel" }) => Promise<void>;
      openExternal?: (url: string) => Promise<boolean>;
      toggleFullScreen?: () => Promise<boolean>;
      isFullScreen?: () => Promise<boolean>;
      onOpenFilePath: (callback: (absolutePath: string) => void) => () => void;
      onMenuCommand: (callback: (command: string) => void) => () => void;
      onBeforeClose: (callback: (data: BeforeCloseData) => void) => () => void;
      onFullScreenChanged?: (callback: (isFullscreen: boolean) => void) => () => void;
    };
  }
}

export {};
