import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SourceSelectItem {
  id: string;
  label: string;
  disabled?: boolean;
}

interface SourceSelectProps {
  items: SourceSelectItem[];
  selectedId: string;
  isLoading?: boolean;
  emptyLabel?: string;
  loadingLabel?: string;
  placeholder?: string;
  onChange: (id: string) => void;
}

const SourceSelect = ({
  items,
  selectedId,
  isLoading = false,
  emptyLabel = "Nenhuma opção disponível.",
  loadingLabel = "Carregando opções...",
  placeholder = "Selecione uma opção...",
  onChange,
}: SourceSelectProps) => {
  if (items.length <= 0) {
    return (
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {isLoading ? loadingLabel : emptyLabel}
      </p>
    );
  }

  return (
    <Select value={selectedId} onValueChange={onChange} disabled={isLoading}>
      <SelectTrigger className="w-full h-8 text-xs bg-white text-foreground border-input">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.id} value={item.id} disabled={item.disabled} className="text-xs">
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export type { SourceSelectItem, SourceSelectProps };
export default SourceSelect;
