import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { navigationSelectionButtonClass, navigationSelectionTitleClass } from "@/styles/buttonStyles";

interface NavigationSelectionButtonProps {
  icon: LucideIcon;
  title: ReactNode;
  description: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  onClick: () => void;
}

const NavigationSelectionButton = ({
  icon: Icon,
  title,
  description,
  selected = false,
  disabled = false,
  className = "",
  ariaLabel,
  onClick,
}: NavigationSelectionButtonProps) => (
  <Button
    variant="ghost"
    className={navigationSelectionButtonClass(className)}
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
  >
    <Icon className="mr-2 h-4 w-4 shrink-0 text-blue-500" />
    <span className="min-w-0 flex-1 text-left">
      <span className={navigationSelectionTitleClass(selected)}>{title}</span>
      <span className="block break-words text-xs text-muted-foreground">{description}</span>
    </span>
  </Button>
);

export default NavigationSelectionButton;
