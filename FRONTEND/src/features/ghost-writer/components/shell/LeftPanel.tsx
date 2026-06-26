import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FileText, Settings } from "lucide-react";
import NavigationSelectionButton from "@/features/ghost-writer/components/common/NavigationSelectionButton";
import { LEFT_NAVIGATION_GROUPS } from "@/features/ghost-writer/config/appRegistry";
import type { ConfigPanelTabId, ParameterPanelSection } from "@/features/ghost-writer/types";
import { navigationSelectionTitleClass, sectionActionButtonClass } from "@/styles/buttonStyles";
import { panelsTopMenuBarBgClass } from "@/styles/backgroundColors";

interface LeftPanelProps {
  onOpenParameterSection: (section: ParameterPanelSection) => void;
  onOpenLogsPanel: (tab: "search" | "llm") => void;
  isLogsPanelOpen: boolean;
  activeLogsTab: "search" | "llm" | null;
  onOpenConfigsPanel: (tab: ConfigPanelTabId) => void;
  isConfigsPanelOpen: boolean;
  activeConfigsTab: ConfigPanelTabId | null;
  isLoading: boolean;
}

type LeftPanelActionId = ParameterPanelSection | "configs" | "logs";

const GHOST_VIDEO_PLAYBACK_RATE = 0.5;
const GHOST_VIDEO_REPLAY_DELAY_MS = 30000;
const GHOST_VIDEO_INITIAL_DELAY_MS = 15000;

const LeftPanel = ({
  onOpenParameterSection,
  onOpenLogsPanel,
  activeLogsTab,
  onOpenConfigsPanel,
  activeConfigsTab,
  isLoading,
}: LeftPanelProps) => {
  const [activeActionId, setActiveActionId] = useState<LeftPanelActionId | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const actionDisabled = isLoading;
  const titleClass = (id: LeftPanelActionId) => navigationSelectionTitleClass(activeActionId === id);

  useEffect(() => {
    if (!isLoading) setActiveActionId(null);
  }, [isLoading]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    let replayTimeoutId: number | null = null;
    let cancelled = false;

    const scheduleReplay = (delayMs: number) => {
      if (cancelled) return;
      if (replayTimeoutId !== null) window.clearTimeout(replayTimeoutId);
      replayTimeoutId = window.setTimeout(() => {
        if (cancelled) return;
        video.currentTime = 0;
        video.playbackRate = GHOST_VIDEO_PLAYBACK_RATE;
        void video.play().catch(() => {
          scheduleReplay(GHOST_VIDEO_REPLAY_DELAY_MS);
        });
      }, delayMs);
    };

    const handleEnded = () => {
      video.pause();
      video.currentTime = 0;
      scheduleReplay(GHOST_VIDEO_REPLAY_DELAY_MS);
    };

    const handleLoadedMetadata = () => {
      video.playbackRate = GHOST_VIDEO_PLAYBACK_RATE;
      scheduleReplay(GHOST_VIDEO_INITIAL_DELAY_MS);
    };

    video.addEventListener("ended", handleEnded);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    if (video.readyState >= 1) handleLoadedMetadata();

    return () => {
      cancelled = true;
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      if (replayTimeoutId !== null) window.clearTimeout(replayTimeoutId);
      video.pause();
      video.currentTime = 0;
    };
  }, []);

  const openSection = (section: ParameterPanelSection) => {
    setActiveActionId(section);
    onOpenParameterSection(section);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`border-b border-border ${panelsTopMenuBarBgClass} px-4 py-4`}>
        <div className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-sm font-semibold text-foreground">Parapreceptor  •   Ghost Writer Editor</h1>
            <p className="text-[11px] text-muted-foreground">Toolbox de escrita conscienciológica.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/55 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.45)] backdrop-blur-sm">
            <div className="pointer-events-none h-px w-full bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent" />
            <video
              ref={videoRef}
              src="/Ghost_Witter_v0.mp4"
              muted
              playsInline
              preload="metadata"
              className="block h-24 w-full object-cover object-center opacity-95"
              aria-label="Animação decorativa do Ghost Writer"
            />
          </div>
        </div>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4">
        <div className="space-y-5">
          {LEFT_NAVIGATION_GROUPS.map((group, groupIndex) => (
            <div key={group.label} className="space-y-2.5">
              {groupIndex > 0 ? <Separator className="mx-[-1rem] my-3 h-[2px] w-[calc(100%+2rem)] bg-border/80" /> : null}
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</Label>
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  if (item.section === "document") {
                    return (
                      <Button
                        key={item.id}
                        variant="ghost"
                        className={`${sectionActionButtonClass} border-0 shadow-none`}
                        onClick={() => openSection(item.section)}
                        disabled={actionDisabled}
                        title={item.title}
                        aria-label={item.title}
                      >
                        <FileText className="mr-2 h-4 w-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 text-left">
                          <span className={titleClass(item.section)}>{item.title}</span>
                          <span className="block break-words text-xs text-muted-foreground">{item.description}</span>
                        </span>
                      </Button>
                    );
                  }

                  return (
                    <NavigationSelectionButton
                      key={item.id}
                      icon={item.icon}
                      title={item.title}
                      description={item.description}
                      selected={activeActionId === item.section}
                      onClick={() => openSection(item.section)}
                      disabled={actionDisabled}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          <Separator className="mx-[-1rem] my-3 h-[2px] w-[calc(100%+2rem)] bg-border/80" />

          <div className="space-y-2.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configurações</Label>

            <Button
              variant="ghost"
              className={`${sectionActionButtonClass} border-0 shadow-none`}
              onClick={() => {
                setActiveActionId("configs");
                onOpenConfigsPanel(activeConfigsTab ?? "sources");
              }}
              disabled={actionDisabled}
              title="Configs"
              aria-label="Configs"
            >
              <Settings className="mr-2 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 text-left">
                <span className={titleClass("configs")}>Configs</span>
                <span className="block break-words text-xs text-muted-foreground">LLM Sources & Configs</span>
              </span>
            </Button>

            <NavigationSelectionButton
              icon={Settings}
              title="Logs"
              description="Search & LLM Logs"
              ariaLabel="Logs"
              selected={activeActionId === "logs"}
              onClick={() => {
                setActiveActionId("logs");
                onOpenLogsPanel(activeLogsTab ?? "search");
              }}
              disabled={actionDisabled}
            />
          </div>

          <Separator className="mx-[-1rem] my-3 h-[2px] w-[calc(100%+2rem)] bg-border/80" />

          <div className="space-y-2.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aplicativos</Label>
            <NavigationSelectionButton
              icon={FileText}
              title="Abrir Apps"
              description="Bibliomancia, Cons-IA e outros"
              selected={activeActionId === "applications"}
              onClick={() => openSection("applications")}
              disabled={actionDisabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeftPanel;

