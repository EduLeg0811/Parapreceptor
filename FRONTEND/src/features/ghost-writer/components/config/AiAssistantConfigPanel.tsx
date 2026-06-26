import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";
import UploadedFilesList from "@/features/ghost-writer/components/config/UploadedFilesList";
import { LLM_MODEL_OPTIONS } from "@/features/ghost-writer/config/constants";
import type { UploadedLlmFile } from "@/features/ghost-writer/services/openai";

interface AiAssistantConfigPanelProps {
  llmModel: string;
  onLlmModelChange: (value: string) => void;
  llmTemperature: number;
  onLlmTemperatureChange: (value: number) => void;
  llmMaxOutputTokens: number;
  onLlmMaxOutputTokensChange: (value: number) => void;
  llmVerbosity: string;
  onLlmVerbosityChange: (value: string) => void;
  llmEffort: string;
  onLlmEffortChange: (value: string) => void;
  selectedVectorStoreId: string;
  onSelectedVectorStoreIdChange: (value: string) => void;
  vectorStoreOptions: Array<{ id: string; label: string }>;
  onUploadFiles: (files: File[]) => void;
  uploadedFiles: UploadedLlmFile[];
  onRemoveUploadedFile: (id: string) => void;
  isUploadingFiles?: boolean;
  showVectorStore?: boolean;
  fixedVectorStoreLabel?: string;
  showUploadedFiles?: boolean;
  includeEditorContextInLlm?: boolean;
  onToggleIncludeEditorContextInLlm?: () => void;
  canToggleIncludeEditorContextInLlm?: boolean;
  extraContent?: React.ReactNode;
  footerContent?: React.ReactNode;
}

const AiAssistantConfigPanel = ({
  llmModel,
  onLlmModelChange,
  llmTemperature,
  onLlmTemperatureChange,
  llmMaxOutputTokens,
  onLlmMaxOutputTokensChange,
  llmVerbosity,
  onLlmVerbosityChange,
  llmEffort,
  onLlmEffortChange,
  selectedVectorStoreId,
  onSelectedVectorStoreIdChange,
  vectorStoreOptions,
  onUploadFiles,
  uploadedFiles,
  onRemoveUploadedFile,
  isUploadingFiles = false,
  showVectorStore = true,
  fixedVectorStoreLabel,
  showUploadedFiles = true,
  includeEditorContextInLlm = false,
  onToggleIncludeEditorContextInLlm,
  canToggleIncludeEditorContextInLlm = true,
  extraContent,
  footerContent,
}: AiAssistantConfigPanelProps) => (
  <div className="space-y-3 pr-1">
    <div className="space-y-1.5">
      <Label className="block pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Configurações LLM</Label>
      <div className="flex items-center gap-0">
        <Label className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Modelo</Label>
        <select
          value={llmModel}
          onChange={(e) => onLlmModelChange(e.target.value)}
          className="h-7 w-full rounded-md border border-input bg-white px-2.5 text-[10px] text-foreground outline-none"
        >
          {LLM_MODEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-0">
        <Label className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Temperatura</Label>
        <Input
          type="number"
          step="0.1"
          min="0"
          max="2"
          value={llmTemperature}
          onChange={(e) => onLlmTemperatureChange(Number(e.target.value))}
          className="h-7 bg-white px-2.5 !text-[10px] md:!text-[10px]"
        />
      </div>
      <div className="flex items-center gap-0">
        <Label className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Max Tokens</Label>
        <Input
          type="number"
          min="1"
          value={llmMaxOutputTokens}
          onChange={(e) => onLlmMaxOutputTokensChange(e.target.value ? Number(e.target.value) : 1000)}
          className="h-7 bg-white px-2.5 !text-[10px] md:!text-[10px]"
        />
      </div>
      <div className="flex items-center gap-0">
        <Label className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Verbosity</Label>
        <Input
          value={llmVerbosity}
          onChange={(e) => onLlmVerbosityChange(e.target.value)}
          placeholder="low | medium | high"
          className="h-7 bg-white px-2.5 !text-[10px] md:!text-[10px]"
        />
      </div>
      <div className="flex items-center gap-0">
        <Label className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Effort</Label>
        <Input
          value={llmEffort}
          onChange={(e) => onLlmEffortChange(e.target.value)}
          placeholder="none | low | medium | high"
          className="h-7 bg-white px-2.5 !text-[10px] md:!text-[10px]"
        />
      </div>
      {showVectorStore ? (
        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Vector Store</Label>
          {fixedVectorStoreLabel ? (
            <div className="flex min-h-7 w-full items-center rounded-md border border-input bg-background px-2.5 text-[10px] text-foreground">
              {fixedVectorStoreLabel}
            </div>
          ) : (
            <select
              value={selectedVectorStoreId}
              onChange={(e) => onSelectedVectorStoreIdChange(e.target.value)}
              className="h-7 w-full rounded-md border border-input bg-white px-2.5 text-[10px] text-foreground outline-none"
            >
              <option value="">none</option>
              {vectorStoreOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : null}
      {extraContent}
      {typeof onToggleIncludeEditorContextInLlm === "function" ? (
        <div className="pt-0.5">
          <Button
            type="button"
            variant="ghost"
            className={`h-8 w-full justify-start rounded-lg border border-border px-2.5 text-left text-[10px] font-semibold shadow-sm ${
              includeEditorContextInLlm
                ? "bg-pink-200 text-pink-800 ring-1 ring-pink-300/80 hover:bg-pink-300 hover:text-pink-900"
                : "bg-white text-muted-foreground hover:bg-zinc-50 hover:text-foreground"
            }`}
            title={canToggleIncludeEditorContextInLlm ? (includeEditorContextInLlm ? "Desativar envio do texto do editor para a LLM" : "Ativar envio do texto do editor para a LLM") : "Disponivel apenas com documento aberto no editor"}
            onClick={onToggleIncludeEditorContextInLlm}
            disabled={!canToggleIncludeEditorContextInLlm}
          >
            <Paperclip className="mr-2 h-3 w-3 shrink-0" />
            <span>Enviar texto do editor</span>
          </Button>
        </div>
      ) : null}
    </div>
    {showUploadedFiles ? (
      <>
        <Separator />
        <UploadedFilesList
          onUploadFiles={onUploadFiles}
          uploadedFiles={uploadedFiles}
          onRemoveUploadedFile={onRemoveUploadedFile}
          isUploadingFiles={isUploadingFiles}
        />
      </>
    ) : null}
    {footerContent ? (
      <>
        <Separator />
        {footerContent}
      </>
    ) : null}
  </div>
);

export default AiAssistantConfigPanel;

