import { AlignLeft, BookOpen, FileText, Hash, ListOrdered, Loader2, RefreshCw, Sparkles, Type, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { TextStats } from "@/features/ghost-writer/hooks/useTextStats";
import type { ActionItemId, Macro2SpacingMode, MacroActionId } from "@/features/ghost-writer/types";
import Macro1HighlightPanel from "@/features/ghost-writer/components/editor/Macro1HighlightPanel";
import Macro2ManualNumberingPanel from "@/features/ghost-writer/components/editor/Macro2ManualNumberingPanel";
import NavigationSelectionButton from "@/features/ghost-writer/components/common/NavigationSelectionButton";
import { parameterMacroMeta } from "@/features/ghost-writer/config/metadata";
import { resolveSemanticActionId } from "@/features/ghost-writer/config/appRegistry";
import { MACRO1_HIGHLIGHT_COLORS } from "@/features/ghost-writer/config/options";
import { uploadDocBgClass } from "@/styles/backgroundColors";
import { sectionActionButtonClass } from "@/styles/buttonStyles";

interface DocumentParameterSectionProps {
  activeMacroId: ActionItemId | null;
  currentFileId: string;
  selectedImportFileName: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  stats: TextStats;
  isLoading: boolean;
  isOpeningDocument: boolean;
  isImportingDocument: boolean;
  macro1Term: string;
  macro1ColorId: (typeof MACRO1_HIGHLIGHT_COLORS)[number]["id"];
  macro1PredictedMatches: number | null;
  isCountingMacro1Matches: boolean;
  macro2SpacingMode: Macro2SpacingMode;
  onCreateBlankDocument: () => void | Promise<void>;
  onDocumentPanelFile: (file: File | null | undefined) => void | Promise<void>;
  onDocumentPanelDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onClearSelectedImportFileName: () => void;
  onRefreshStats: () => void | Promise<void>;
  onOpenMacro: (macroId: MacroActionId) => void | Promise<void>;
  onMacro1TermChange: (value: string) => void;
  onMacro1ColorChange: (value: (typeof MACRO1_HIGHLIGHT_COLORS)[number]["id"]) => void;
  onRunMacro1Highlight: () => void | Promise<void>;
  onClearMacro1Highlight: () => void | Promise<void>;
  onMacro2SpacingModeChange: (value: Macro2SpacingMode) => void;
  onRunMacro2ManualNumbering: () => void | Promise<void>;
}

const DocumentParameterSection = ({
  activeMacroId,
  currentFileId,
  selectedImportFileName,
  fileInputRef,
  stats,
  isLoading,
  isOpeningDocument,
  isImportingDocument,
  macro1Term,
  macro1ColorId,
  macro1PredictedMatches,
  isCountingMacro1Matches,
  macro2SpacingMode,
  onCreateBlankDocument,
  onDocumentPanelFile,
  onDocumentPanelDrop,
  onClearSelectedImportFileName,
  onRefreshStats,
  onOpenMacro,
  onMacro1TermChange,
  onMacro1ColorChange,
  onRunMacro1Highlight,
  onClearMacro1Highlight,
  onMacro2SpacingModeChange,
  onRunMacro2ManualNumbering,
}: DocumentParameterSectionProps) => {
  const resolvedMacroId = resolveSemanticActionId(activeMacroId) as MacroActionId | null;

  return (
  <div className="scrollbar-thin h-full min-h-0 overflow-y-auto p-3">
    <div className="space-y-3">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Criar ou Abrir Documento</Label>

      <Button
        variant="secondary"
        size="sm"
        className={`${sectionActionButtonClass} ${uploadDocBgClass} hover:bg-muted/30`}
        onClick={() => void onCreateBlankDocument()}
        disabled={isLoading || isOpeningDocument || isImportingDocument}
      >
        <FileText className="mr-2 h-4 w-4" />
        <span>Novo Documento em Branco</span>
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.pdf"
        className="hidden"
        onChange={(event) => void onDocumentPanelFile(event.target.files?.[0])}
      />

      {!selectedImportFileName ? (
        <div
          onDrop={onDocumentPanelDrop}
          onDragOver={(event) => event.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed border-border ${uploadDocBgClass} p-3 text-center hover:bg-muted/30`}
        >
          {isImportingDocument ? (
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          )}
          <span className="text-sm text-foreground">Arraste ou selecione</span>
          <span className="mt-1 block text-xs text-muted-foreground">DOCX ou PDF</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm text-foreground">{selectedImportFileName}</span>
          <button
            type="button"
            className="ml-auto text-muted-foreground hover:text-destructive"
            onClick={onClearSelectedImportFileName}
            aria-label="Remover arquivo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Separator className="my-1" />

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estatísticas</Label>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => void onRefreshStats()} title="Atualizar">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: FileText, label: "Páginas", value: stats.pages },
            { icon: AlignLeft, label: "Parágrafos", value: stats.paragraphs },
            { icon: Type, label: "Palavras", value: stats.words },
            { icon: Hash, label: "Caracteres", value: stats.characters },
            { icon: Sparkles, label: "Logias", value: stats.logiaWords },
            { icon: BookOpen, label: "Sesquipedais", value: stats.sesquipedal },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-md bg-muted/50 px-2.5 py-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
              <div className="text-sm font-semibold text-[hsl(var(--stat-value))]">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-1" />

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Editor de Texto</Label>
        <NavigationSelectionButton
          icon={BookOpen}
          title={parameterMacroMeta.macro1.title}
          description={parameterMacroMeta.macro1.description}
          selected={resolvedMacroId === "macro1"}
          onClick={() => void onOpenMacro("macro1")}
          disabled={isLoading || !currentFileId}
        />

        <NavigationSelectionButton
          icon={ListOrdered}
          title={parameterMacroMeta.macro2.title}
          description={parameterMacroMeta.macro2.description}
          selected={resolvedMacroId === "macro2"}
          onClick={() => void onOpenMacro("macro2")}
          disabled={isLoading || !currentFileId}
        />
      </div>

      {resolvedMacroId ? <Separator className="my-1" /> : null}

      {resolvedMacroId === "macro1" ? (
        <Macro1HighlightPanel
          title={parameterMacroMeta.macro1.title}
          description={parameterMacroMeta.macro1.description}
          term={macro1Term}
          onTermChange={onMacro1TermChange}
          colorOptions={MACRO1_HIGHLIGHT_COLORS.map((item) => ({ ...item }))}
          selectedColorId={macro1ColorId}
          onSelectColor={(value) => onMacro1ColorChange(value as (typeof MACRO1_HIGHLIGHT_COLORS)[number]["id"])}
          onRunHighlight={() => void onRunMacro1Highlight()}
          onRunClear={() => void onClearMacro1Highlight()}
          isRunning={isLoading}
          predictedMatches={macro1PredictedMatches}
          isCountingMatches={isCountingMacro1Matches}
          hasDocumentOpen={Boolean(currentFileId)}
          showPanelChrome={false}
        />
      ) : null}

      {resolvedMacroId === "macro2" ? (
        <Macro2ManualNumberingPanel
          title={parameterMacroMeta.macro2.title}
          description={parameterMacroMeta.macro2.description}
          spacingMode={macro2SpacingMode}
          onSpacingModeChange={onMacro2SpacingModeChange}
          isRunning={isLoading}
          onRun={() => void onRunMacro2ManualNumbering()}
          showPanelChrome={false}
        />
      ) : null}
    </div>
  </div>
  );
};

export default DocumentParameterSection;

