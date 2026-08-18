import { useEffect, useRef } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap,
} from "@codemirror/language";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { autocompletion, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import type { ThemeMode } from "../core/types";

type EditorPaneProps = {
  value: string;
  onChange: (value: string) => void;
  theme: ThemeMode;
  fontScale?: number;
  readOnly?: boolean;
  onSave?: () => void;
  onScroll?: (view: EditorView) => void;
  onSelectionChange?: (view: EditorView) => void;
  onEditorViewReady?: (view: EditorView | null) => void;
};

export function EditorPane({
  value,
  onChange,
  theme,
  fontScale = 1,
  readOnly = false,
  onSave,
  onScroll,
  onSelectionChange,
  onEditorViewReady,
}: EditorPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartment = useRef(new Compartment());
  const readOnlyCompartment = useRef(new Compartment());
  const fontSizeCompartment = useRef(new Compartment());
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onScrollRef = useRef(onScroll);
  onScrollRef.current = onScroll;
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;
  const onEditorViewReadyRef = useRef(onEditorViewReady);
  onEditorViewReadyRef.current = onEditorViewReady;

  const isDarkMode =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    if (!containerRef.current) return;

    const customBaseTheme = EditorView.theme(
      {
        "&": {
          height: "100%",
          fontSize: `${14 * fontScale}px`,
          fontFamily: '"Cascadia Code", "Fira Code", Consolas, "Courier New", monospace',
          backgroundColor: isDarkMode ? "#0f1520" : "#ffffff",
          color: isDarkMode ? "#f1f5f9" : "#0f172a",
        },
        ".cm-scroller": {
          overflow: "auto",
          fontFamily: '"Cascadia Code", "Fira Code", Consolas, "Courier New", monospace',
          lineHeight: "1.65",
        },
        ".cm-content": {
          padding: "16px 14px",
          caretColor: isDarkMode ? "#38bdf8" : "#2563eb",
        },
        ".cm-gutters": {
          backgroundColor: isDarkMode ? "#0b1018" : "#f1f5f9",
          color: isDarkMode ? "#64748b" : "#94a3b8",
          borderRight: isDarkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
          paddingRight: "6px",
        },
        ".cm-activeLine": {
          backgroundColor: isDarkMode ? "rgba(56, 189, 248, 0.06)" : "rgba(37, 99, 235, 0.04)",
        },
        ".cm-activeLineGutter": {
          backgroundColor: isDarkMode ? "rgba(56, 189, 248, 0.12)" : "rgba(37, 99, 235, 0.08)",
          color: isDarkMode ? "#38bdf8" : "#2563eb",
        },
        ".cm-selectionBackground, ::selection": {
          backgroundColor: isDarkMode ? "rgba(56, 189, 248, 0.22) !important" : "rgba(37, 99, 235, 0.16) !important",
        },
      },
      { dark: isDarkMode }
    );

    const saveKeyBinding = keymap.of([
      {
        key: "Mod-s",
        run: () => {
          if (onSaveRef.current) {
            onSaveRef.current();
            return true;
          }
          return false;
        },
      },
    ]);

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        markdown(),
        EditorView.lineWrapping,
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
        ]),
        saveKeyBinding,
        themeCompartment.current.of(isDarkMode ? [oneDark, customBaseTheme] : [customBaseTheme]),
        readOnlyCompartment.current.of(EditorState.readOnly.of(readOnly)),
        fontSizeCompartment.current.of(
          EditorView.theme({
            "&": { fontSize: `${14 * fontScale}px` },
          })
        ),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const docString = update.state.doc.toString();
            onChangeRef.current(docString);
          }
          if (update.selectionSet || update.docChanged) {
            onSelectionChangeRef.current?.(update.view);
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    onEditorViewReadyRef.current?.(view);

    const onScroll = () => {
      onScrollRef.current?.(view);
    };

    view.scrollDOM.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      view.scrollDOM.removeEventListener("scroll", onScroll);
      onEditorViewReadyRef.current?.(null);
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Update document content if changed from outside
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (value !== currentDoc) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
    }
  }, [value]);

  // Update theme dynamically
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const customBaseTheme = EditorView.theme(
      {
        "&": {
          height: "100%",
          backgroundColor: isDarkMode ? "#0f1520" : "#ffffff",
          color: isDarkMode ? "#f1f5f9" : "#0f172a",
        },
        ".cm-gutters": {
          backgroundColor: isDarkMode ? "#0b1018" : "#f1f5f9",
          color: isDarkMode ? "#64748b" : "#94a3b8",
          borderRight: isDarkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
        },
      },
      { dark: isDarkMode }
    );
    view.dispatch({
      effects: themeCompartment.current.reconfigure(isDarkMode ? [oneDark, customBaseTheme] : [customBaseTheme]),
    });
  }, [isDarkMode]);

  // Update font scale dynamically
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: fontSizeCompartment.current.reconfigure(
        EditorView.theme({
          "&": { fontSize: `${14 * fontScale}px` },
        })
      ),
    });
  }, [fontScale]);

  // Update readonly state
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(readOnly)),
    });
  }, [readOnly]);

  return (
    <div
      ref={containerRef}
      className="editor-pane-container"
      data-testid="codemirror-editor"
      style={{ width: "100%", height: "100%", overflow: "hidden" }}
    />
  );
}
