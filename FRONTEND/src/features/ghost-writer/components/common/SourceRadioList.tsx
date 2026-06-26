interface SourceRadioListItem {
  id: string;
  label: string;
  disabled?: boolean;
}

interface SourceRadioListProps {
  name: string;
  items: SourceRadioListItem[];
  selectedId: string;
  isLoading?: boolean;
  emptyLabel?: string;
  loadingLabel?: string;
  onChange: (id: string) => void;
}

const SourceRadioList = ({
  name,
  items,
  selectedId,
  isLoading = false,
  emptyLabel = "Nenhuma opcao disponivel.",
  loadingLabel = "Carregando opcoes.",
  onChange,
}: SourceRadioListProps) => {
  if (items.length <= 0) {
    return (
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {isLoading ? loadingLabel : emptyLabel}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <label key={item.id} className="flex cursor-pointer items-center gap-2 text-xs text-foreground">
          <input
            type="radio"
            name={name}
            value={item.id}
            checked={selectedId === item.id}
            disabled={isLoading || item.disabled}
            onChange={() => onChange(item.id)}
          />
          <span>{item.label}</span>
        </label>
      ))}
    </div>
  );
};

export type { SourceRadioListItem, SourceRadioListProps };
export default SourceRadioList;
