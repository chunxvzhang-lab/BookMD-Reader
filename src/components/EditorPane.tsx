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
};

export function EditorPane({
  value,
  onChange,
  theme,
  fontScale = 1,
  readOnly = false,
  onSave,
}: EditorPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartment = useRef(new Compartment());
  const readOnlyCompartment = useRef(new Compartment());
  const fontSizeCompartment = useRef(new Compartment());
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

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
          fontFamily: '"Cascadia Code", Consolas, "Courier New", monospace',
          backgroundColor: "var(--surface)",
          color: "var(--text)",
        },
        ".cm-scroller": {
          overflow: "auto",
          fontFamily: '"Cascadia Code", Consolas, "Courier New", monospace',
          lineHeight: "1.6",
        },
        ".cm-content": {
          padding: "16px 12px",
          caretColor: "var(--accent)",
        },
        ".cm-gutters": {
          backgroundColor: "var(--surface-sunken, color-mix(in srgb, var(--surface) 90%, var(--text) 10%))",
          color: "var(--text-muted)",
          borderRight: "1px solid var(--border)",
          paddingRight: "4px",
        },
        ".cm-activeLine": {
          backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)",
        },
        ".cm-activeLineGutter": {
          backgroundColor: "color-mix(in srgb, var(--accent) 15%, transparent)",
          color: "var(--accent)",
        },
        ".cm-selectionBackground, ::selection": {
          backgroundColor: "color-mix(in srgb, var(--accent) 25%, transparent) !important",
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
            onChange(docString);
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
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
          backgroundColor: "var(--surface)",
          color: "var(--text)",
        },
        ".cm-gutters": {
          backgroundColor: "var(--surface-sunken, color-mix(in srgb, var(--surface) 90%, var(--text) 10%))",
          color: "var(--text-muted)",
          borderRight: "1px solid var(--border)",
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
