import { useCallback, useEffect } from "react";
import type { Dispatch, DragEventHandler, MutableRefObject, RefObject, SetStateAction } from "react";
import { createBlankDocOnServer, fetchFileContentBuffer, fetchFileText, saveFileText, uploadFileToServer, type UploadedFileMeta } from "@/features/ghost-writer/api/backendApi";
import { buildDocxBlobFromHtml } from "@/features/ghost-writer/services/docxExport";
import { cleanupConvertedPdfHeaderHtml, parseDocxArrayBuffer, warmupDocxParser } from "@/features/ghost-writer/services/fileParser";
import { HtmlEditorControlApi } from "@/features/ghost-writer/services/htmlEditorControl";
import { markdownToEditorHtml, normalizeHistoryContentToMarkdown, plainTextToEditorHtml } from "@/lib/markdown";
import type { AIResponse, Macro2SpacingMode, ParameterPanelTarget } from "@/features/ghost-writer/types";
import { PDF_HEADER_SIGNATURE_RE } from "@/features/ghost-writer/config/constants";

interface ToastApi {
  error: (message: string) => void;
  info: (message: string) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
}

interface UseGhostWriterDocumentParams {
  currentFileId: string;
  setCurrentFileId: Dispatch<SetStateAction<string>>;
  currentFileName: string;
  setCurrentFileName: Dispatch<SetStateAction<string>>;
  currentFileConvertedFromPdf: boolean;
  setCurrentFileConvertedFromPdf: Dispatch<SetStateAction<boolean>>;
  documentText: string;
  setDocumentText: Dispatch<SetStateAction<string>>;
  editorContentHtml: string;
  setEditorContentHtml: Dispatch<SetStateAction<string>>;
  openedDocumentVersion: number;
  setOpenedDocumentVersion: Dispatch<SetStateAction<number>>;
  setDocumentPageCount: Dispatch<SetStateAction<number | null>>;
  setDocumentParagraphCount: Dispatch<SetStateAction<number | null>>;
  setDocumentWordCount: Dispatch<SetStateAction<number | null>>;
  setDocumentSymbolCount: Dispatch<SetStateAction<number | null>>;
  setDocumentSymbolWithSpacesCount: Dispatch<SetStateAction<number | null>>;
  setStatsKey: Dispatch<SetStateAction<number>>;
  setActionText: Dispatch<SetStateAction<string>>;
  setIsOpeningDocument: Dispatch<SetStateAction<boolean>>;
  setIsImportingDocument: Dispatch<SetStateAction<boolean>>;
  setSelectedImportFileName: Dispatch<SetStateAction<string>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setIsExportingDocx: Dispatch<SetStateAction<boolean>>;
  setParameterPanelTarget: Dispatch<SetStateAction<ParameterPanelTarget>>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  htmlEditorControlApi: HtmlEditorControlApi | null;
  setHtmlEditorControlApi: Dispatch<SetStateAction<HtmlEditorControlApi | null>>;
  htmlEditorControlApiRef: MutableRefObject<HtmlEditorControlApi | null>;
  currentFileIdRef: MutableRefObject<string>;
  saveTimerRef: MutableRefObject<number | null>;
  responses: AIResponse[];
  macro1Term: string;
  macro1ColorId: string;
  setMacro1PredictedMatches: Dispatch<SetStateAction<number | null>>;
  setIsCountingMacro1Matches: Dispatch<SetStateAction<boolean>>;
  macro1CountRequestIdRef: MutableRefObject<number>;
  macro2SpacingMode: Macro2SpacingMode;
  toast: ToastApi;
  requestDownloadBeforeClose: () => Promise<boolean>;
}

const useGhostWriterDocument = ({
  currentFileId,
  setCurrentFileId,
  currentFileName,
  setCurrentFileName,
  currentFileConvertedFromPdf,
  setCurrentFileConvertedFromPdf,
  documentText,
  setDocumentText,
  editorContentHtml,
  setEditorContentHtml,
  openedDocumentVersion,
  setOpenedDocumentVersion,
  setDocumentPageCount,
  setDocumentParagraphCount,
  setDocumentWordCount,
  setDocumentSymbolCount,
  setDocumentSymbolWithSpacesCount,
  setStatsKey,
  setActionText,
  setIsOpeningDocument,
  setIsImportingDocument,
  setSelectedImportFileName,
  setIsLoading,
  setIsExportingDocx,
  setParameterPanelTarget,
  fileInputRef,
  htmlEditorControlApi,
  setHtmlEditorControlApi,
  htmlEditorControlApiRef,
  currentFileIdRef,
  saveTimerRef,
  responses,
  macro1Term,
  macro1ColorId,
  setMacro1PredictedMatches,
  setIsCountingMacro1Matches,
  macro1CountRequestIdRef,
  macro2SpacingMode,
  toast,
  requestDownloadBeforeClose,
}: UseGhostWriterDocumentParams) => {
  useEffect(() => {
    void warmupDocxParser();
  }, []);

  useEffect(() => {
    currentFileIdRef.current = currentFileId;
  }, [currentFileId, currentFileIdRef]);

  const refreshDocumentText = useCallback(async (fileId: string) => {
    if (!fileId) {
      setDocumentText("");
      setEditorContentHtml("<p></p>");
      setDocumentPageCount(null);
      setDocumentParagraphCount(null);
      setDocumentWordCount(null);
      setDocumentSymbolCount(null);
      setDocumentSymbolWithSpacesCount(null);
      return;
    }
    try {
      const data = await fetchFileText(fileId);
      const baseText = data.text || "";
      const savedHtml = (data.html || "").trim();
      setDocumentText(baseText);

      if (savedHtml) {
        const shouldCleanupSavedHtml = currentFileConvertedFromPdf || PDF_HEADER_SIGNATURE_RE.test(savedHtml);
        const cleanedSavedHtml = shouldCleanupSavedHtml
          ? cleanupConvertedPdfHeaderHtml(savedHtml).trim()
          : savedHtml;
        setEditorContentHtml(cleanedSavedHtml);
        if (shouldCleanupSavedHtml && cleanedSavedHtml !== savedHtml) {
          void saveFileText(fileId, { text: baseText, html: cleanedSavedHtml });
        }
        return;
      }

      if ((data.ext || "").toLowerCase() === "docx") {
        try {
          const buffer = await fetchFileContentBuffer(fileId);
          const parsedHtml = (await parseDocxArrayBuffer(buffer)).trim();
          const shouldCleanupParsedHtml = currentFileConvertedFromPdf || PDF_HEADER_SIGNATURE_RE.test(parsedHtml);
          const convertedHtml = shouldCleanupParsedHtml
            ? cleanupConvertedPdfHeaderHtml(parsedHtml).trim()
            : parsedHtml;
          if (convertedHtml) {
            setEditorContentHtml(convertedHtml);
            void saveFileText(fileId, { text: baseText, html: convertedHtml });
            return;
          }
        } catch {
          // fallback abaixo
        }
      }

      setEditorContentHtml(plainTextToEditorHtml(baseText));
    } catch {
      setDocumentText("");
      setEditorContentHtml("<p></p>");
    } finally {
      setOpenedDocumentVersion((value) => value + 1);
    }
  }, [currentFileConvertedFromPdf, setDocumentPageCount, setDocumentParagraphCount, setDocumentSymbolCount, setDocumentSymbolWithSpacesCount, setDocumentText, setDocumentWordCount, setEditorContentHtml, setOpenedDocumentVersion]);

  const refreshDocumentPageCount = useCallback(async () => {
    const editorApi = htmlEditorControlApiRef.current ?? htmlEditorControlApi;
    if (!editorApi || !currentFileId) {
      setDocumentPageCount(null);
      setDocumentParagraphCount(null);
      setDocumentWordCount(null);
      setDocumentSymbolCount(null);
      setDocumentSymbolWithSpacesCount(null);
      return;
    }
    try {
      const statsData = await editorApi.getDocumentStats();
      setDocumentPageCount(statsData.pages);
      setDocumentParagraphCount(statsData.paragraphs);
      setDocumentWordCount(statsData.words);
      setDocumentSymbolCount(statsData.symbols);
      setDocumentSymbolWithSpacesCount(statsData.symbolsWithSpaces);
    } catch {
      setDocumentPageCount(null);
      setDocumentParagraphCount(null);
      setDocumentWordCount(null);
      setDocumentSymbolCount(null);
      setDocumentSymbolWithSpacesCount(null);
    }
  }, [currentFileId, htmlEditorControlApi, htmlEditorControlApiRef, setDocumentPageCount, setDocumentParagraphCount, setDocumentSymbolCount, setDocumentSymbolWithSpacesCount, setDocumentWordCount]);

  useEffect(() => {
    void refreshDocumentText(currentFileId);
  }, [currentFileId, refreshDocumentText]);

  useEffect(() => {
    void refreshDocumentPageCount();
  }, [refreshDocumentPageCount]);

  useEffect(() => {
    if (!currentFileId) return;
    const timerId = window.setTimeout(() => {
      void refreshDocumentPageCount();
      setStatsKey((value) => value + 1);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [currentFileId, openedDocumentVersion, refreshDocumentPageCount, setStatsKey]);

  const handleWordFileUpload = useCallback(async (file: File): Promise<UploadedFileMeta> => {
    setIsOpeningDocument(true);
    try {
      const uploaded = await uploadFileToServer(file);
      if (uploaded.ext !== "docx") {
        const reason = uploaded.conversionError ? ` ${uploaded.conversionError}` : "";
        throw new Error(`Nao foi possivel abrir no editor. Use DOCX ou PDF convertido para DOCX.${reason}`);
      }
      setActionText("");
      setCurrentFileId(uploaded.id);
      setCurrentFileName(uploaded.originalName || uploaded.storedName || "documento.docx");
      setCurrentFileConvertedFromPdf(Boolean(uploaded.convertedFromPdf));
      return uploaded;
    } finally {
      setIsOpeningDocument(false);
    }
  }, [setActionText, setCurrentFileConvertedFromPdf, setCurrentFileId, setCurrentFileName, setIsOpeningDocument]);

  const handleDocumentPanelFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setIsImportingDocument(true);
    setSelectedImportFileName(file.name);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!["docx", "pdf"].includes(ext)) {
        throw new Error("Formato nao suportado. Use DOCX ou PDF.");
      }
      await handleWordFileUpload(file);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao importar arquivo.");
      setSelectedImportFileName("");
    } finally {
      setIsImportingDocument(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [fileInputRef, handleWordFileUpload, setIsImportingDocument, setSelectedImportFileName, toast]);

  const handleDocumentPanelDrop: DragEventHandler<HTMLDivElement> = useCallback((event) => {
    event.preventDefault();
    void handleDocumentPanelFile(event.dataTransfer.files?.[0]);
  }, [handleDocumentPanelFile]);

  const handleCreateBlankDocument = useCallback(async () => {
    setIsOpeningDocument(true);
    try {
      const created = await createBlankDocOnServer("novo-documento.docx");
      setActionText("");
      setCurrentFileId(created.id);
      setCurrentFileName(created.originalName || created.storedName || "novo-documento.docx");
      setCurrentFileConvertedFromPdf(false);
    } finally {
      setIsOpeningDocument(false);
    }
  }, [setActionText, setCurrentFileConvertedFromPdf, setCurrentFileId, setCurrentFileName, setIsOpeningDocument]);

  const handleRefreshStats = useCallback(async () => {
    if (!currentFileId) {
      toast.error("Nenhum documento aberto no editor.");
      return;
    }
    await refreshDocumentPageCount();
    setStatsKey((value) => value + 1);
  }, [currentFileId, refreshDocumentPageCount, setStatsKey, toast]);

  const getEditorApi = useCallback(async (): Promise<HtmlEditorControlApi | null> => {
    const immediate = htmlEditorControlApiRef.current ?? htmlEditorControlApi;
    if (immediate) return immediate;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 80));
      const api = htmlEditorControlApiRef.current ?? htmlEditorControlApi;
      if (api) return api;
    }
    return null;
  }, [htmlEditorControlApi, htmlEditorControlApiRef]);

  const handleRetrieveSelectedText = useCallback(async () => {
    const editorApi = htmlEditorControlApiRef.current ?? htmlEditorControlApi;
    if (!editorApi) {
      toast.error("API do editor indisponivel no momento.");
      return;
    }
    try {
      const selected = (await editorApi.getSelectedText()).trim();
      if (!selected) throw new Error("Nenhum texto selecionado no editor.");
      setActionText(selected);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao obter selecao.");
    }
  }, [htmlEditorControlApi, htmlEditorControlApiRef, setActionText, toast]);

  const handleImportSelectedTextToActions = useCallback(async () => {
    setParameterPanelTarget({ section: "actions", id: null });
    await handleRetrieveSelectedText();
  }, [handleRetrieveSelectedText, setParameterPanelTarget]);

  const handleSelectAllContent = useCallback(async () => {
    const editorApi = htmlEditorControlApiRef.current ?? htmlEditorControlApi;
    if (!editorApi) {
      toast.error("Controle do editor indisponivel.");
      return;
    }
    try {
      await editorApi.selectAllContent();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao selecionar todo o documento.");
    }
  }, [htmlEditorControlApi, htmlEditorControlApiRef, toast]);

  const handleTriggerSave = useCallback(async () => {
    const editorApi = htmlEditorControlApiRef.current ?? htmlEditorControlApi;
    if (!editorApi) {
      toast.error("API do editor indisponivel no momento.");
      return;
    }
    if (responses.length === 0) {
      toast.error("Ainda nao ha resposta no historico para aplicar.");
      return;
    }
    const latestResponse = responses[0]?.content?.trim() || "";
    if (!latestResponse) {
      toast.error("A ultima resposta do historico esta vazia.");
      return;
    }
    try {
      const markdownContent = normalizeHistoryContentToMarkdown(latestResponse);
      const html = markdownToEditorHtml(markdownContent);
      await editorApi.replaceSelectionRich(markdownContent, html);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao aplicar resposta no editor.");
    }
  }, [htmlEditorControlApi, htmlEditorControlApiRef, responses, toast]);

  const handleAppendHistoryToEditor = useCallback(async (html: string) => {
    const editorApi = await getEditorApi();
    if (!editorApi) {
      toast.error("Abra o editor antes de inserir no documento.");
      return;
    }
    try {
      await editorApi.appendRichWithBlankLine(html);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao inserir conteudo no editor.");
    }
  }, [getEditorApi, toast]);

  const handleRunMacro2ManualNumbering = useCallback(async () => {
    const editorApi = await getEditorApi();
    if (!editorApi) {
      toast.error("Abra o editor antes de executar Macro2.");
      return;
    }
    setIsLoading(true);
    try {
      await editorApi.runMacro2ManualNumberingSelection(macro2SpacingMode);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao executar Macro2.");
    } finally {
      setIsLoading(false);
    }
  }, [getEditorApi, macro2SpacingMode, setIsLoading, toast]);

  const handleEditorControlApiReady = useCallback((api: HtmlEditorControlApi | null) => {
    if (api) {
      htmlEditorControlApiRef.current = api;
      setHtmlEditorControlApi(api);
      return;
    }
    if (currentFileIdRef.current) return;
    htmlEditorControlApiRef.current = null;
    setHtmlEditorControlApi(null);
  }, [currentFileIdRef, htmlEditorControlApiRef, setHtmlEditorControlApi]);

  useEffect(() => {
    const input = macro1Term.trim();
    const editorApi = htmlEditorControlApiRef.current ?? htmlEditorControlApi;
    const hasDocumentOpen = Boolean(currentFileId);
    if (!input || !editorApi || !hasDocumentOpen) {
      setIsCountingMacro1Matches(false);
      setMacro1PredictedMatches(null);
      return;
    }
    const requestId = macro1CountRequestIdRef.current + 1;
    macro1CountRequestIdRef.current = requestId;
    setIsCountingMacro1Matches(true);
    void editorApi
      .countOccurrencesInDocument(input)
      .then((count) => {
        if (macro1CountRequestIdRef.current !== requestId) return;
        setMacro1PredictedMatches(count);
      })
      .catch(() => {
        if (macro1CountRequestIdRef.current !== requestId) return;
        setMacro1PredictedMatches(0);
      })
      .finally(() => {
        if (macro1CountRequestIdRef.current !== requestId) return;
        setIsCountingMacro1Matches(false);
      });
  }, [currentFileId, editorContentHtml, htmlEditorControlApi, htmlEditorControlApiRef, macro1CountRequestIdRef, macro1Term, setIsCountingMacro1Matches, setMacro1PredictedMatches]);

  const handleRunMacro1Highlight = useCallback(async () => {
    const editorApi = await getEditorApi();
    if (!editorApi) {
      toast.error("Abra o editor antes de executar Highlight.");
      return;
    }
    const input = macro1Term.trim();
    if (!input) {
      toast.error("Informe o termo no painel Parameters.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await editorApi.runMacro1HighlightDocument(input, macro1ColorId);
      if (result.matches <= 0) {
        toast.info("Highlight executado. Nenhuma ocorr\u00eancia encontrada.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao executar Highlight.");
    } finally {
      setIsLoading(false);
    }
  }, [getEditorApi, macro1ColorId, macro1Term, setIsLoading, toast]);

  const handleClearMacro1Highlight = useCallback(async () => {
    const editorApi = await getEditorApi();
    if (!editorApi) {
      toast.error("Abra o editor antes de limpar marcacao.");
      return;
    }
    const input = macro1Term.trim();
    if (!input) {
      toast.error("Informe o termo no painel Parameters.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await editorApi.clearMacro1HighlightDocument(input);
      if (result.matches <= 0 || result.cleared <= 0) {
        toast.info("Nenhuma marcacao encontrada para limpar.");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao limpar marcacao.");
    } finally {
      setIsLoading(false);
    }
  }, [getEditorApi, macro1Term, setIsLoading, toast]);

  const handleEditorContentChange = useCallback(({ html, text }: { html: string; text: string }) => {
    setEditorContentHtml(html);
    setDocumentText(text);
    if (!currentFileId) return;
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      void saveFileText(currentFileId, { text, html }).catch(() => {
        // silencioso para evitar toasts em cada tecla
      });
    }, 600);
  }, [currentFileId, saveTimerRef, setDocumentText, setEditorContentHtml]);

  useEffect(() => () => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
  }, [saveTimerRef]);

  const handleExportDocx = useCallback(async () => {
    if (!currentFileId) {
      toast.error("Nenhum documento aberto para exportar.");
      return;
    }
    setIsExportingDocx(true);
    try {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      let latestText = documentText;
      let latestHtml = editorContentHtml;
      const editorApi = htmlEditorControlApiRef.current ?? htmlEditorControlApi;
      if (editorApi) {
        latestText = await editorApi.getDocumentText();
        latestHtml = await editorApi.getDocumentHtml();
      }
      await saveFileText(currentFileId, { text: latestText, html: latestHtml });
      const blob = await buildDocxBlobFromHtml(latestHtml || "<p></p>");
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const baseName = (currentFileName || "documento").trim();
      const fileName = baseName.toLowerCase().endsWith(".docx") ? baseName : `${baseName}.docx`;
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao exportar DOCX.");
    } finally {
      setIsExportingDocx(false);
    }
  }, [currentFileId, currentFileName, documentText, editorContentHtml, htmlEditorControlApi, htmlEditorControlApiRef, saveTimerRef, setIsExportingDocx, toast]);

  const closeEditor = useCallback(() => {
    setCurrentFileId("");
    setCurrentFileName("");
    setCurrentFileConvertedFromPdf(false);
  }, [setCurrentFileConvertedFromPdf, setCurrentFileId, setCurrentFileName]);

  const handleCloseEditorWithPrompt = useCallback(async () => {
    const shouldDownload = await requestDownloadBeforeClose();
    if (shouldDownload) {
      await handleExportDocx();
    }
    closeEditor();
  }, [closeEditor, handleExportDocx, requestDownloadBeforeClose]);

  return {
    refreshDocumentText,
    refreshDocumentPageCount,
    handleDocumentPanelDrop,
    handleDocumentPanelFile,
    handleCreateBlankDocument,
    handleRefreshStats,
    handleRetrieveSelectedText,
    handleImportSelectedTextToActions,
    handleSelectAllContent,
    handleTriggerSave,
    getEditorApi,
    handleAppendHistoryToEditor,
    handleRunMacro2ManualNumbering,
    handleEditorControlApiReady,
    handleRunMacro1Highlight,
    handleClearMacro1Highlight,
    handleEditorContentChange,
    handleExportDocx,
    handleCloseEditorWithPrompt,
    handleWordFileUpload,
  };
};

export default useGhostWriterDocument;

