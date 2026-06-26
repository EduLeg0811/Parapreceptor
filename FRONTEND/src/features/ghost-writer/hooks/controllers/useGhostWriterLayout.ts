import { useEffect, useMemo, useRef, useState } from "react";
import type { ConfigPanelTabId, LogPanelTabId, MobilePanelId, ParameterPanelTarget } from "@/features/ghost-writer/types";

interface UseGhostWriterLayoutParams {
  hasEditorPanel: boolean;
}

const useGhostWriterLayout = ({ hasEditorPanel }: UseGhostWriterLayoutParams) => {
  const [parameterPanelTarget, setParameterPanelTarget] = useState<ParameterPanelTarget>(null);
  const [activeLogPanel, setActiveLogPanel] = useState<LogPanelTabId | null>(null);
  const [activeConfigPanel, setActiveConfigPanel] = useState<ConfigPanelTabId | null>(null);
  const [lastActiveLogPanel, setLastActiveLogPanel] = useState<LogPanelTabId>("search");
  const [lastActiveConfigPanel, setLastActiveConfigPanel] = useState<ConfigPanelTabId>("sources");
  const [isMobileView, setIsMobileView] = useState(false);
  const [activeMobilePanel, setActiveMobilePanel] = useState<MobilePanelId>("left");
  const previousHasEditorPanelRef = useRef(false);

  const isChatConfigOpen = activeConfigPanel === "sources";
  const hasCenterPanel = Boolean(parameterPanelTarget);
  const hasJsonPanel = Boolean(activeLogPanel || activeConfigPanel);
  const mobilePanelOptions: Array<{ id: MobilePanelId; label: string; disabled?: boolean }> = useMemo(() => [
    { id: "left", label: "Menu" },
    { id: "center", label: "Parametros", disabled: !hasCenterPanel },
    { id: "right", label: "Historico" },
    { id: "editor", label: "Editor", disabled: !hasEditorPanel },
    { id: "json", label: activeConfigPanel ? "Configs" : "Logs", disabled: !hasJsonPanel },
  ], [activeConfigPanel, hasCenterPanel, hasEditorPanel, hasJsonPanel]);

  const showJsonPanel = hasJsonPanel && (!isMobileView || activeMobilePanel === "json");
  const showLeftPanel = !isMobileView || activeMobilePanel === "left";
  const showCenterPanel = hasCenterPanel && (!isMobileView || activeMobilePanel === "center");
  const showRightPanel = !isMobileView || activeMobilePanel === "right";
  const showEditorPanel = hasEditorPanel && (!isMobileView || activeMobilePanel === "editor");

  useEffect(() => {
    if (activeLogPanel) setLastActiveLogPanel(activeLogPanel);
  }, [activeLogPanel]);

  useEffect(() => {
    if (activeConfigPanel) setLastActiveConfigPanel(activeConfigPanel);
  }, [activeConfigPanel]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const applyMobileState = (isMobile: boolean) => {
      setIsMobileView(isMobile);
    };
    applyMobileState(mediaQuery.matches);
    const handleChange = (event: MediaQueryListEvent) => applyMobileState(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!isMobileView) return;
    if (activeMobilePanel === "json" && !hasJsonPanel) {
      setActiveMobilePanel("left");
      return;
    }
    if (activeMobilePanel === "center" && !hasCenterPanel) {
      setActiveMobilePanel(hasEditorPanel ? "editor" : "left");
      return;
    }
    if (activeMobilePanel === "editor" && !hasEditorPanel) {
      setActiveMobilePanel("left");
    }
  }, [activeMobilePanel, hasCenterPanel, hasEditorPanel, hasJsonPanel, isMobileView]);

  useEffect(() => {
    if (!isMobileView) {
      previousHasEditorPanelRef.current = hasEditorPanel;
      return;
    }
    if (!previousHasEditorPanelRef.current && hasEditorPanel) {
      setActiveMobilePanel("editor");
    }
    previousHasEditorPanelRef.current = hasEditorPanel;
  }, [hasEditorPanel, isMobileView]);

  return {
    parameterPanelTarget,
    setParameterPanelTarget,
    activeLogPanel,
    setActiveLogPanel,
    lastActiveLogPanel,
    activeConfigPanel,
    setActiveConfigPanel,
    lastActiveConfigPanel,
    isMobileView,
    activeMobilePanel,
    setActiveMobilePanel,
    isChatConfigOpen,
    hasCenterPanel,
    hasJsonPanel,
    mobilePanelOptions,
    showJsonPanel,
    showLeftPanel,
    showCenterPanel,
    showRightPanel,
    showEditorPanel,
  };
};

export default useGhostWriterLayout;
