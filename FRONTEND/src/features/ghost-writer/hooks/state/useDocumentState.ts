import { useRef, useState } from "react";
import { HtmlEditorControlApi } from "@/features/ghost-writer/services/htmlEditorControl";
import type { Macro2SpacingMode } from "@/features/ghost-writer/types";
import { MACRO1_HIGHLIGHT_COLORS } from "@/features/ghost-writer/config/options";
export const useGhostWriterDocumentState = () => {
  const [documentText, setDocumentText] = useState("");
  const [currentFileName, setCurrentFileName] = useState("");
  const [currentFileConvertedFromPdf, setCurrentFileConvertedFromPdf] = useState(false);
  const [documentPageCount, setDocumentPageCount] = useState<number | null>(null);
  const [documentParagraphCount, setDocumentParagraphCount] = useState<number | null>(null);
  const [documentWordCount, setDocumentWordCount] = useState<number | null>(null);
  const [documentSymbolCount, setDocumentSymbolCount] = useState<number | null>(null);
  const [documentSymbolWithSpacesCount, setDocumentSymbolWithSpacesCount] = useState<number | null>(null);
  const [currentFileId, setCurrentFileId] = useState("");
  const [statsKey, setStatsKey] = useState(0);
  const [openedDocumentVersion, setOpenedDocumentVersion] = useState(0);
  const [editorContentHtml, setEditorContentHtml] = useState("<p></p>");
  const [isOpeningDocument, setIsOpeningDocument] = useState(false);
  const [htmlEditorControlApi, setHtmlEditorControlApi] = useState<HtmlEditorControlApi | null>(null);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isImportingDocument, setIsImportingDocument] = useState(false);
  const [selectedImportFileName, setSelectedImportFileName] = useState("");
  const [macro1Term, setMacro1Term] = useState("");
  const [macro1ColorId, setMacro1ColorId] = useState<(typeof MACRO1_HIGHLIGHT_COLORS)[number]["id"]>("yellow");
  const [macro1PredictedMatches, setMacro1PredictedMatches] = useState<number | null>(null);
  const [isCountingMacro1Matches, setIsCountingMacro1Matches] = useState(false);
  const [macro2SpacingMode, setMacro2SpacingMode] = useState<Macro2SpacingMode>("nbsp_double");

  const saveTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const htmlEditorControlApiRef = useRef<HtmlEditorControlApi | null>(null);
  const currentFileIdRef = useRef("");
  const macro1CountRequestIdRef = useRef(0);

  return {
    documentText,
    setDocumentText,
    currentFileName,
    setCurrentFileName,
    currentFileConvertedFromPdf,
    setCurrentFileConvertedFromPdf,
    documentPageCount,
    setDocumentPageCount,
    documentParagraphCount,
    setDocumentParagraphCount,
    documentWordCount,
    setDocumentWordCount,
    documentSymbolCount,
    setDocumentSymbolCount,
    documentSymbolWithSpacesCount,
    setDocumentSymbolWithSpacesCount,
    currentFileId,
    setCurrentFileId,
    statsKey,
    setStatsKey,
    openedDocumentVersion,
    setOpenedDocumentVersion,
    editorContentHtml,
    setEditorContentHtml,
    isOpeningDocument,
    setIsOpeningDocument,
    htmlEditorControlApi,
    setHtmlEditorControlApi,
    isExportingDocx,
    setIsExportingDocx,
    isImportingDocument,
    setIsImportingDocument,
    selectedImportFileName,
    setSelectedImportFileName,
    macro1Term,
    setMacro1Term,
    macro1ColorId,
    setMacro1ColorId,
    macro1PredictedMatches,
    setMacro1PredictedMatches,
    isCountingMacro1Matches,
    setIsCountingMacro1Matches,
    macro2SpacingMode,
    setMacro2SpacingMode,
    saveTimerRef,
    fileInputRef,
    htmlEditorControlApiRef,
    currentFileIdRef,
    macro1CountRequestIdRef,
  };
};


