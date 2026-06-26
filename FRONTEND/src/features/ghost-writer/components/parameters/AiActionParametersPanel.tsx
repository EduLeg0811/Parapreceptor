import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, Play, Settings, X } from "lucide-react";
import { primaryActionButtonClass } from "@/styles/buttonStyles";
import { panelsTopMenuBarBgClass } from "@/styles/backgroundColors";

interface AiActionParametersPanelProps {
  title: string;
  description: string;
  actionText: string;
  onActionTextChange: (value: string) => void;
  queryText?: string;
  onQueryTextChange?: (value: string) => void;
  onRetrieveSelectedText: () => void;
  onApply: () => void;
  isLoading: boolean;
  hasDocumentOpen: boolean;
  showLanguageSelect?: boolean;
  languageOptions?: Array<{ value: string; label: string }>;
  selectedLanguage?: string;
  onSelectedLanguageChange?: (value: string) => void;
  showApplyButton?: boolean;
  applyButtonDisabled?: boolean;
  showConfigButton?: boolean;
  onToggleConfig?: () => void;
  isConfigOpen?: boolean;
  showActionTextArea?: boolean;
  beforeApplyContent?: ReactNode;
  onClose?: () => void;
  showPanelChrome?: boolean;
}

const AiActionParametersPanel = ({
  title,
  description,
  actionText,
  onActionTextChange,
  queryText = "",
  onQueryTextChange,
  onRetrieveSelectedText,
  onApply,
  isLoading,
  hasDocumentOpen,
  showLanguageSelect = false,
  languageOptions = [],
  selectedLanguage = "",
  onSelectedLanguageChange,
  showApplyButton = true,
  applyButtonDisabled = false,
  showConfigButton = false,
  onToggleConfig,
  isConfigOpen = false,
  showActionTextArea = true,
  beforeApplyContent,
  onClose,
  showPanelChrome = true,
}: AiActionParametersPanelProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const queryTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const resizeQueryTextarea = () => {
    const el = queryTextareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useLayoutEffect(() => {
    resizeTextarea();
  }, [actionText]);

  useLayoutEffect(() => {
    resizeQueryTextarea();
  }, [queryText]);

  const applyButton = showApplyButton ? (
    <Button
      variant="secondary"
      size="sm"
      className={primaryActionButtonClass}
      onClick={onApply}
      disabled={isLoading || applyButtonDisabled}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-black relative z-10" />
          <span className="relative z-10 text-blue-500">{title}</span>
        </>
      ) : (
        <>
          <Play className="mr-2 h-4 w-4 text-black relative z-10" />
          <span className="relative z-10 text-blue-500">{title}</span>
        </>
      )}
    </Button>
  ) : null;

  const content = (
    <div className="flex h-full flex-col">
      <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {showConfigButton ? (
            <div className="mb-1 flex justify-end">
              <button
                type="button"
                onClick={() => void onToggleConfig?.()}
                title={isConfigOpen ? "Ocultar configurações IA" : "Configurações IA"}
                aria-label={isConfigOpen ? "Ocultar configurações IA" : "Configurações IA"}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground shadow-sm transition hover:bg-zinc-50 hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          {showPanelChrome ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          ) : null}

          {showLanguageSelect && (
            <div className="flex items-center gap-2">
              <Label className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Idioma</Label>
              <select
                value={selectedLanguage}
                onChange={(e) => onSelectedLanguageChange?.(e.target.value)}
                className="ml-auto h-8 w-[30ch] rounded-md border border-border bg-white px-3 text-xs outline-none focus:border-primary"
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showActionTextArea ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-1 text-xs font-medium hover:bg-primary/5"
                  onClick={onRetrieveSelectedText}
                  disabled={isLoading || !hasDocumentOpen}
                >
                  <span className="text-blue-500">Select & Import</span>
                  <ArrowLeft className="ml-2 h-4 w-4 shrink-0 text-blue-500" />
                </Button>
              </div>
              <textarea
                ref={textareaRef}
                rows={4}
                value={actionText}
                onChange={(e) => {
                  onActionTextChange(e.target.value);
                  resizeTextarea();
                }}
                placeholder="Write a word, phrase or text"
                className="min-h-[96px] w-full overflow-hidden resize-none rounded-md border border-border bg-white px-3 py-2 text-xs outline-none focus:border-primary"
              />
            </div>
          ) : null}

          {typeof onQueryTextChange === "function" && (
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Query</Label>
              <textarea
                ref={queryTextareaRef}
                rows={3}
                value={queryText}
                onChange={(e) => {
                  onQueryTextChange(e.target.value);
                  resizeQueryTextarea();
                }}
                placeholder="Escreva a query a ser enviada para a LLM"
                className="min-h-[80px] w-full overflow-hidden resize-none rounded-md border border-border bg-white px-3 py-2 text-xs outline-none focus:border-primary"
              />
            </div>
          )}

          {beforeApplyContent}

          {applyButton}
        </div>
      </div>
    </div>
  );

  if (!showPanelChrome) return content;

  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center justify-between border-b border-border ${panelsTopMenuBarBgClass} px-4 py-3`}>
        <h2 className="text-sm font-semibold text-foreground">Parameters</h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title="Fechar Parameters">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {content}
    </div>
  );
};

export default AiActionParametersPanel;
