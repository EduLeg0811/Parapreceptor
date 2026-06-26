import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useSystemConfirmation } from "@/components/SystemConfirmationProvider";
import { DEFAULT_MAX_RESULTS_DOCX, DEFAULT_MINI_ARLINDO_TEXT_WINDOW } from "@/features/ghost-writer/config/constants";

interface GeneralConfigsPanelProps {
  miniArlindoTextWindow: number;
  maxResultsDocx: number;
  onMiniArlindoTextWindowChange: (value: number) => void;
  onMaxResultsDocxChange: (value: number) => void;
  onResetAllConfig: () => void;
}

const GeneralConfigsPanel = ({
  miniArlindoTextWindow,
  maxResultsDocx,
  onMiniArlindoTextWindowChange,
  onMaxResultsDocxChange,
  onResetAllConfig,
}: GeneralConfigsPanelProps) => {
  const { requestSystemConfirmation } = useSystemConfirmation();

  return (
    <div className="flex h-full min-h-0 flex-col p-3">
    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="block pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ajustes Gerais</Label>
          <div className="flex items-center gap-0">
            <Label className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Janela Mini</Label>
            <Input
              type="number"
              min="0"
              max="20"
              value={miniArlindoTextWindow}
              onChange={(e) => onMiniArlindoTextWindowChange(e.target.value ? Number(e.target.value) : DEFAULT_MINI_ARLINDO_TEXT_WINDOW)}
              className="h-7 bg-white px-2.5 !text-[10px] md:!text-[10px]"
            />
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Frases antes e depois do termo localizado (MIni_Arlindo e Anots_Tertulia).
          </p>
          <div className="flex items-center gap-0 pt-2">
            <Label className="w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">MAX DOCX</Label>
            <Input
              type="number"
              min="1"
              max="5000"
              value={maxResultsDocx}
              onChange={(e) => onMaxResultsDocxChange(e.target.value ? Number(e.target.value) : DEFAULT_MAX_RESULTS_DOCX)}
              className="h-7 bg-white px-2.5 !text-[10px] md:!text-[10px]"
            />
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Limite maximo de resultados exportados nos DOCX de Lexical Overview e Semantic Overview.
          </p>
        </div>

        <Separator />

        <div className="flex justify-center">
          <button
            type="button"
            className="inline-flex h-8 items-center justify-center rounded-full border border-orange-200 bg-orange-50 px-4 text-center text-[10px] font-semibold text-orange-900 shadow-sm hover:bg-orange-100 hover:text-orange-950"
            onClick={async () => {
              const shouldReset = await requestSystemConfirmation({
                title: "Reset Config Parameters",
                description: "Reset all config parameters. Are you shure?",
              });
              if (!shouldReset) return;
              onResetAllConfig();
            }}
          >
            Reset Config Parameters
          </button>
        </div>
      </div>
    </div>
    </div>
  );
};

export default GeneralConfigsPanel;
