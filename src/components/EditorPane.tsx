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
  HighlightStyle,
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
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
  typewriterMode?: boolean;
  onSave?: () => void;
  onScroll?: (view: EditorView) => void;
  onSelectionChange?: (view: EditorView) => void;
  onEditorViewReady?: (view: EditorView | null) => void;
};

// Rich, high-contrast syntax highlighting for Light Theme (Warm Orange-Yellow Accent)
const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.heading, color: "#1f2328", fontWeight: "700" },
  { tag: tags.heading1, color: "#d97706", fontWeight: "800" },
  { tag: tags.heading2, color: "#1f2328", fontWeight: "700" },
  { tag: tags.heading3, color: "#1f2328", fontWeight: "600" },
  { tag: [tags.keyword, tags.controlKeyword, tags.definitionKeyword], color: "#cf222e", fontWeight: "600" },
  { tag: [tags.name, tags.deleted, tags.character, tags.macroName], color: "#cf222e" },
  { tag: [tags.propertyName], color: "#116329" },
  { tag: [tags.variableName, tags.definition(tags.variableName)], color: "#953800" },
  { tag: [tags.function(tags.variableName), tags.labelName], color: "#8250df" },
  { tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)], color: "#0550ae" },
  { tag: [tags.definition(tags.typeName), tags.typeName], color: "#953800" },
  { tag: [tags.number, tags.changed, tags.annotation, tags.modifier, tags.self, tags.namespace], color: "#0550ae", fontWeight: "600" },
  { tag: [tags.operator, tags.operatorKeyword, tags.url, tags.escape, tags.regexp, tags.special(tags.string)], color: "#0550ae" },
  { tag: [tags.meta, tags.comment], color: "#6e7781", fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.link, color: "#d97706", textDecoration: "underline" },
  { tag: tags.monospace, color: "#c2410c", backgroundColor: "rgba(245, 158, 11, 0.12)", borderRadius: "3px" },
  { tag: [tags.string, tags.inserted], color: "#0a3069" },
  { tag: [tags.atom, tags.bool, tags.special(tags.variableName)], color: "#0550ae", fontWeight: "600" },
  { tag: tags.invalid, color: "#cf222e" },
]);

function buildCustomTheme(isDarkMode: boolean, fontScale: number, typewriterMode = false) {
  const accentColor = isDarkMode ? "#1d9bf0" : "#d97706";
  return EditorView.theme(
    {
      "&": {
        height: "100%",
        fontSize: `${14 * fontScale}px`,
        fontFamily: '"Cascadia Code", "Fira Code", Consolas, "Courier New", monospace',
        backgroundColor: isDarkMode ? "#000000" : "#ffffff",
        color: isDarkMode ? "#f1f5f9" : "#1f2328",
      },
      ".cm-scroller": {
        overflow: "auto",
        fontFamily: '"Cascadia Code", "Fira Code", Consolas, "Courier New", monospace',
        lineHeight: "1.65",
      },
      ".cm-content": {
        padding: "16px 14px",
        paddingBottom: typewriterMode ? "50vh" : "16px",
        caretColor: accentColor,
      },
      ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: `${accentColor} !important`,
        borderLeftWidth: "2.5px !important",
      },
      ".cm-gutters": {
        backgroundColor: isDarkMode ? "#0a0d12" : "#f8fafc",
        color: isDarkMode ? "#71767b" : "#64748b",
        borderRight: isDarkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
        paddingRight: "6px",
      },
      // Active line: distinct luminous background with inset accent edge
      ".cm-activeLine": {
        backgroundColor: isDarkMode
          ? "rgba(29, 155, 240, 0.16) !important"
          : "rgba(245, 158, 11, 0.10) !important",
        boxShadow: `inset 3.5px 0 0 0 ${accentColor} !important`,
      },
      // Active line gutter line number
      ".cm-activeLineGutter": {
        backgroundColor: isDarkMode
          ? "rgba(29, 155, 240, 0.22) !important"
          : "rgba(245, 158, 11, 0.16) !important",
        color: `${accentColor} !important`,
        fontWeight: "bold",
      },
      // Selection highlight
      ".cm-selectionBackground, .cm-selectionLayer .cm-selectionBackground, ::selection": {
        backgroundColor: isDarkMode
          ? "rgba(29, 155, 240, 0.35) !important"
          : "rgba(245, 158, 11, 0.25) !important",
      },
      // Selection search match
      ".cm-selectionMatch": {
        backgroundColor: isDarkMode
          ? "rgba(29, 155, 240, 0.25) !important"
          : "rgba(245, 158, 11, 0.18) !important",
        outline: isDarkMode
          ? "1px solid rgba(29, 155, 240, 0.6) !important"
          : "1px solid rgba(217, 119, 6, 0.45) !important",
      },
    },
    { dark: isDarkMode }
  );
}

export function EditorPane({
  value,
  onChange,
  theme,
  fontScale = 1,
  readOnly = false,
  typewriterMode = false,
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
  const typewriterRafRef = useRef<number | null>(null);
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
  const typewriterModeRef = useRef(typewriterMode);
  typewriterModeRef.current = typewriterMode;

  const isDarkMode =
    theme === "twitter" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  const lastInternalValueRef = useRef(value);

  const triggerSmoothTypewriterScroll = (view: EditorView) => {
    if (!typewriterModeRef.current) return;
    if (!view.state.selection.main.empty) return;

    if (typewriterRafRef.current !== null) {
      cancelAnimationFrame(typewriterRafRef.current);
    }

    typewriterRafRef.current = requestAnimationFrame(() => {
      typewriterRafRef.current = null;
      try {
        const head = view.state.selection.main.head;
        const coords = view.coordsAtPos(head);
        if (!coords) return;

        const scroller = view.scrollDOM;
        const scrollerRect = scroller.getBoundingClientRect();
        const currentLineCenter = (coords.top + coords.bottom) / 2;
        const desiredLineCenter = scrollerRect.top + scrollerRect.height * 0.45;
        const diff = currentLineCenter - desiredLineCenter;

        // Smoothly adjust when moving across lines (diff > 6px) to avoid micro-jitter during horizontal typing
        if (Math.abs(diff) > 6) {
          const targetScrollTop = Math.max(0, scroller.scrollTop + diff);
          scroller.scrollTo({
            top: targetScrollTop,
            behavior: "smooth",
          });
        }
      } catch {
        // ignore detached DOM errors
      }
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const customBaseTheme = buildCustomTheme(isDarkMode, fontScale, typewriterMode);

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

    lastInternalValueRef.current = value;
    const initialCursorPos = 0;

    const state = EditorState.create({
      doc: value,
      selection: { anchor: initialCursorPos, head: initialCursorPos },
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
        themeCompartment.current.of(
          isDarkMode
            ? [oneDark, customBaseTheme]
            : [customBaseTheme, syntaxHighlighting(lightHighlightStyle), syntaxHighlighting(defaultHighlightStyle, { fallback: true })]
        ),
        readOnlyCompartment.current.of(EditorState.readOnly.of(readOnly)),
        fontSizeCompartment.current.of(
          EditorView.theme({
            "&": { fontSize: `${14 * fontScale}px` },
          })
        ),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const docString = update.state.doc.toString();
            lastInternalValueRef.current = docString;
            onChangeRef.current(docString);
          }
          if (update.selectionSet || update.docChanged) {
            onSelectionChangeRef.current?.(update.view);

            if (typewriterModeRef.current && update.view.state.selection.main.empty) {
              triggerSmoothTypewriterScroll(update.view);
            }
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
      if (typewriterRafRef.current !== null) {
        cancelAnimationFrame(typewriterRafRef.current);
      }
      view.scrollDOM.removeEventListener("scroll", onScroll);
      onEditorViewReadyRef.current?.(null);
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Update document content if changed from outside (e.g. reload or undo), preserving cursor position
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (value === lastInternalValueRef.current && value === currentDoc) {
      return;
    }
    if (value !== currentDoc) {
      lastInternalValueRef.current = value;
      const currentSelection = view.state.selection.main;
      const targetPos = Math.min(currentSelection.head, value.length);
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
        selection: { anchor: targetPos, head: targetPos },
      });
    }
  }, [value]);

  // Update theme and typewriter mode dynamically
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const customBaseTheme = buildCustomTheme(isDarkMode, fontScale, typewriterMode);
    view.dispatch({
      effects: themeCompartment.current.reconfigure(
        isDarkMode
          ? [oneDark, customBaseTheme]
          : [customBaseTheme, syntaxHighlighting(lightHighlightStyle), syntaxHighlighting(defaultHighlightStyle, { fallback: true })]
      ),
    });
    if (typewriterMode) {
      triggerSmoothTypewriterScroll(view);
    }
  }, [isDarkMode, fontScale, typewriterMode]);

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
