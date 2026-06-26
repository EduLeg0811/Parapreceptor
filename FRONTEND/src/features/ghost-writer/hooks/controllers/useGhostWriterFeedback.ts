import { useCallback, useEffect, useRef, useState } from "react";

export type HistoryNoticeTone = "error" | "notice";

export interface HistoryNotice {
  message: string;
  tone: HistoryNoticeTone;
}

const useGhostWriterFeedback = () => {
  const [historyNotice, setHistoryNotice] = useState<HistoryNotice | null>(null);
  const historyNoticeTimeoutRef = useRef<number | null>(null);

  const showHistoryNotice = useCallback((message: string, tone: HistoryNoticeTone = "notice") => {
    const trimmed = (message || "").trim();
    if (!trimmed) return;
    setHistoryNotice({ message: trimmed, tone });
    if (historyNoticeTimeoutRef.current !== null) {
      window.clearTimeout(historyNoticeTimeoutRef.current);
    }
    historyNoticeTimeoutRef.current = window.setTimeout(() => {
      setHistoryNotice(null);
      historyNoticeTimeoutRef.current = null;
    }, 4500);
  }, []);

  useEffect(() => () => {
    if (historyNoticeTimeoutRef.current !== null) {
      window.clearTimeout(historyNoticeTimeoutRef.current);
    }
  }, []);

  const toast = useRef({
    error: (message: string) => showHistoryNotice(message, "error"),
    info: (message: string) => showHistoryNotice(message, "notice"),
    success: (message: string) => showHistoryNotice(message, "notice"),
    warning: (message: string) => showHistoryNotice(message, "notice"),
  }).current;

  return {
    historyNotice,
    showHistoryNotice,
    toast,
  };
};

export default useGhostWriterFeedback;
