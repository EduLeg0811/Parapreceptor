import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import { Color, FontFamily, FontSize, LineHeight, TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { ArrowLeft, Bold, Download, Highlighter, Italic, List, ListOrdered, Paperclip, Redo2, RotateCcw, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HtmlEditorControlApi } from "@/features/ghost-writer/services/htmlEditorControl";
import { panelsTopMenuBarBgClass } from "@/styles/backgroundColors";

const GhostWriterTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => (attributes.style ? { style: attributes.style } : {}),
      },
    };
  },
});

interface HtmlEditorProps {
  contentHtml: string;
  documentVersion?: number;
  onControlApiReady?: (api: HtmlEditorControlApi | null) => void;
  onContentChange?: (payload: { html: string; text: string }) => void;
  onCloseEditor?: () => void;
  onExportDocx?: () => void;
  isExportingDocx?: boolean;
  includeEditorContextInLlm?: boolean;
  onToggleIncludeEditorContextInLlm?: () => void;
  canToggleIncludeEditorContextInLlm?: boolean;
  onImportSelectedText?: () => void;
}

const HtmlEditor = ({
  contentHtml,
  documentVersion = 0,
  onControlApiReady,
  onContentChange,
  onCloseEditor,
  onExportDocx,
  isExportingDocx = false,
  includeEditorContextInLlm = false,
  onToggleIncludeEditorContextInLlm,
  canToggleIncludeEditorContextInLlm = true,
  onImportSelectedText,
}: HtmlEditorProps) => {
  const controlApiRef = useRef<HtmlEditorControlApi | null>(null);
  const onControlApiReadyRef = useRef<HtmlEditorProps["onControlApiReady"]>(onControlApiReady);
  const [documentFontSizePx, setDocumentFontSizePx] = useState(15);
  const [documentLineHeightRatio, setDocumentLineHeightRatio] = useState(1.6);
  const [resetSpacingVersion, setResetSpacingVersion] = useState(0);
  const compactSpacingFrameRef = useRef<number | null>(null);
  const DEFAULT_DOCUMENT_FONT_SIZE_PX = 12;
  const DEFAULT_DOCUMENT_LINE_HEIGHT_RATIO = 1.5;
  const toolbarSeparatorClass = "mx-1.5 h-6 w-px bg-zinc-400/90 shadow-[0_0_0_1px_rgba(255,255,255,0.22)]";

  const normalizedContent = useMemo(() => (contentHtml || "").trim(), [contentHtml]);

  useEffect(() => {
    onControlApiReadyRef.current = onControlApiReady;
    if (controlApiRef.current) {
      onControlApiReadyRef.current?.(controlApiRef.current);
    }
  }, [onControlApiReady]);

  const applyDocumentFontSize = useCallback((nextFontSizePx: number) => {
    const clamped = Math.max(8, Math.min(72, nextFontSizePx));
    setDocumentFontSizePx(clamped);
  }, []);

  const increaseDocumentFontSize = useCallback(() => {
    applyDocumentFontSize(documentFontSizePx + 1);
  }, [applyDocumentFontSize, documentFontSizePx]);

  const decreaseDocumentFontSize = useCallback(() => {
    applyDocumentFontSize(documentFontSizePx - 1);
  }, [applyDocumentFontSize, documentFontSizePx]);

  const applyDocumentLineHeight = useCallback((nextRatio: number) => {
    const clampedRatio = Math.max(0.8, Math.min(3, Number(nextRatio.toFixed(2))));
    setDocumentLineHeightRatio(clampedRatio);
  }, []);

  const increaseDocumentLineHeight = useCallback(() => {
    applyDocumentLineHeight(documentLineHeightRatio + 0.1);
  }, [applyDocumentLineHeight, documentLineHeightRatio]);

  const decreaseDocumentLineHeight = useCallback(() => {
    applyDocumentLineHeight(documentLineHeightRatio - 0.1);
  }, [applyDocumentLineHeight, documentLineHeightRatio]);

  const resetDocumentTypography = useCallback(() => {
    setDocumentFontSizePx(DEFAULT_DOCUMENT_FONT_SIZE_PX);
    setDocumentLineHeightRatio(DEFAULT_DOCUMENT_LINE_HEIGHT_RATIO);
    setResetSpacingVersion((prev) => prev + 1);
  }, []);

  const applyCompactListSpacing = useCallback((root: HTMLElement | null) => {
    if (!root) return;

    const blocks = Array.from(root.querySelectorAll("p, ul, ol")) as HTMLElement[];
    // eslint-disable-next-line no-useless-escape
    const manualListRegex = /^\s*(\d{1,3}[\.\)]|[-*•])(?:\s|\u00A0)+/;
    const endsWithColonRegex = /:\s*$/;

    for (const block of blocks) {
      block.classList.remove("manual-tight-list-item", "tight-list-intro");
    }

    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      const tagName = block.tagName.toLowerCase();

      if (tagName === "p" && manualListRegex.test(block.textContent || "")) {
        block.classList.add("manual-tight-list-item");
        const previous = blocks[index - 1];
        if (previous?.tagName.toLowerCase() === "p" && endsWithColonRegex.test((previous.textContent || "").replace(/\u00A0/g, " "))) {
          previous.classList.add("tight-list-intro");
        }
        continue;
      }

      if (tagName !== "ul" && tagName !== "ol") continue;

      const previous = blocks[index - 1];
      if (previous?.tagName.toLowerCase() === "p" && endsWithColonRegex.test((previous.textContent || "").replace(/\u00A0/g, " "))) {
        previous.classList.add("tight-list-intro");
      }
    }
  }, []);

  const scheduleApplyCompactListSpacing = useCallback((root: HTMLElement | null) => {
    if (!root) return;
    if (compactSpacingFrameRef.current !== null) {
      cancelAnimationFrame(compactSpacingFrameRef.current);
    }
    compactSpacingFrameRef.current = requestAnimationFrame(() => {
      applyCompactListSpacing(root);
      compactSpacingFrameRef.current = null;
    });
  }, [applyCompactListSpacing]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      LineHeight,
      GhostWriterTable.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ["paragraph", "heading"] }),
    ],
    content: normalizedContent || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "min-h-full w-full px-6 py-5 text-foreground focus:outline-none",
      },
    },
    onCreate: ({ editor: e }) => {
      const api = new HtmlEditorControlApi(e);
      api.init();
      controlApiRef.current = api;
      onControlApiReadyRef.current?.(api);
      scheduleApplyCompactListSpacing(e.view.dom as HTMLElement);
    },
    onUpdate: ({ editor: e }) => {
      scheduleApplyCompactListSpacing(e.view.dom as HTMLElement);
      onContentChange?.({
        html: e.getHTML(),
        text: e.getText({ blockSeparator: "\n" }),
      });
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = (editor.getHTML() || "").trim();
    const next = normalizedContent || "<p></p>";
    if (current === next) return;
    editor.commands.setContent(next, { emitUpdate: true });
  }, [editor, normalizedContent]);

  useEffect(() => {
    if (!editor) return;
    scheduleApplyCompactListSpacing(editor.view.dom as HTMLElement);
  }, [documentFontSizePx, documentLineHeightRatio, editor, normalizedContent, scheduleApplyCompactListSpacing]);

  useEffect(() => {
    if (!editor || resetSpacingVersion === 0) return;
    scheduleApplyCompactListSpacing(editor.view.dom as HTMLElement);
  }, [editor, resetSpacingVersion, scheduleApplyCompactListSpacing]);

  useEffect(() => {
    return () => {
      if (compactSpacingFrameRef.current !== null) {
        cancelAnimationFrame(compactSpacingFrameRef.current);
        compactSpacingFrameRef.current = null;
      }
      if (controlApiRef.current) {
        controlApiRef.current.destroy();
        controlApiRef.current = null;
      }
      onControlApiReadyRef.current?.(null);
    };
  }, []);

  useEffect(() => {
    // Applies the same typography baseline used by the Reset button whenever a document is opened/reloaded.
    setDocumentFontSizePx(DEFAULT_DOCUMENT_FONT_SIZE_PX);
    setDocumentLineHeightRatio(DEFAULT_DOCUMENT_LINE_HEIGHT_RATIO);
  }, [documentVersion]);

  if (!editor) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Abrindo editor...</div>;
  }

  return (
    <div
      className="doc-editor-root flex h-full flex-col"
      style={
        {
          "--doc-font-size": `${documentFontSizePx}px`,
          "--doc-line-height": `${documentLineHeightRatio}`,
        } as CSSProperties
      }
    >
      <style>{`
        .doc-editor-root .tableWrapper {
          margin: 0.75em 0;
          overflow-x: auto;
        }

        .doc-editor-root .tableWrapper table,
        .doc-editor-root table {
          width: 100%;
          border-collapse: collapse;
          border-spacing: 0;
          border: 1px solid rgba(34,197,94,0.22);
          background: rgba(255,255,255,0.78);
        }

        .doc-editor-root .tableWrapper th,
        .doc-editor-root .tableWrapper td,
        .doc-editor-root table th,
        .doc-editor-root table td {
          border: 1px solid rgba(24,24,27,0.12);
          padding: 8px 10px;
          vertical-align: top;
        }

        .doc-editor-root .tableWrapper th,
        .doc-editor-root table th {
          background: rgba(115,115,115,0.5);
          color: rgb(255,255,255);
          font-weight: 600;
        }
      `}</style>
      <div className={`flex flex-wrap items-center gap-1 border-b border-border ${panelsTopMenuBarBgClass} px-4 py-2.5`}>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 bg-amber-50 text-blue-600 hover:bg-amber-100 hover:text-blue-700"
          title="Importar texto selecionado"
          onClick={onImportSelectedText}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className={toolbarSeparatorClass} aria-hidden="true" />
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title="Negrito" onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title="Italico" onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title="Lista com marcadores" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          title="Marca-texto amarelo"
          onClick={() => editor.chain().focus().toggleHighlight({ color: "yellow" }).run()}
        >
          <Highlighter className="h-4 w-4" />
        </Button>
        <div className={toolbarSeparatorClass} aria-hidden="true" />
        <Button type="button" variant="ghost" className="h-8 px-2 text-xs font-semibold" onClick={decreaseDocumentFontSize} title="Diminuir fonte de todo o documento">
          A-
        </Button>
        <Button type="button" variant="ghost" className="h-8 px-2 text-xs font-semibold" onClick={increaseDocumentFontSize} title="Aumentar fonte de todo o documento">
          A+
        </Button>
        <Button type="button" variant="ghost" className="h-8 px-2 text-xs font-semibold" onClick={decreaseDocumentLineHeight} title="Diminuir espacamento entre linhas de todo o documento">
          LH-
        </Button>
        <Button type="button" variant="ghost" className="h-8 px-2 text-xs font-semibold" onClick={increaseDocumentLineHeight} title="Aumentar espacamento entre linhas de todo o documento">
          LH+
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={resetDocumentTypography} title="Resetar fonte e espacamento para o padrao">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <div className={toolbarSeparatorClass} aria-hidden="true" />
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title="Desfazer" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title="Refazer" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </Button>
        <div className={toolbarSeparatorClass} aria-hidden="true" />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={onExportDocx}
          disabled={isExportingDocx}
          title="Exportar DOCX"
        >
          <Download className="h-4 w-4" />
        </Button>
        <div className={toolbarSeparatorClass} aria-hidden="true" />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={`h-8 w-8 ${includeEditorContextInLlm ? "bg-pink-200 text-pink-800 ring-1 ring-pink-300/80 hover:bg-pink-300 hover:text-pink-900" : "bg-transparent text-muted-foreground hover:bg-white/30 hover:text-foreground"}`}
          title={canToggleIncludeEditorContextInLlm ? (includeEditorContextInLlm ? "Desativar envio do texto do editor para a LLM" : "Ativar envio do texto do editor para a LLM") : "Disponivel apenas com documento aberto no editor"}
          onClick={onToggleIncludeEditorContextInLlm}
          disabled={!canToggleIncludeEditorContextInLlm}
        >
          <Paperclip className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="ml-auto h-8 w-8"
          onClick={onCloseEditor}
          title="Fechar editor"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
};

export default HtmlEditor;

