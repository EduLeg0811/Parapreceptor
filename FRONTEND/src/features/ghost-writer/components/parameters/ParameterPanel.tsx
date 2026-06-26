import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { panelsTopMenuBarBgClass } from "@/styles/backgroundColors";

interface ParameterPanelProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}

const ParameterPanel = ({ title, description, onClose, children }: ParameterPanelProps) => (
  <div className="flex h-full min-h-0 flex-col overflow-hidden">
    <div className={`flex items-start justify-between border-b border-border ${panelsTopMenuBarBgClass} px-4 py-3`}>
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onClose}
        title={`Fechar ${title}`}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
    {children}
  </div>
);

export default ParameterPanel;
