interface SourceBlockCheckboxListItem {
  id: string;
  label: string;
}

interface SourceBlockCheckboxListGroup {
  title: string;
  items: SourceBlockCheckboxListItem[];
}

interface SourceBlockCheckboxListProps {
  groups: SourceBlockCheckboxListGroup[];
  selectedIds: string[];
  onToggleItem: (id: string, checked: boolean) => void;
}

const SourceBlockCheckboxList = ({
  groups,
  selectedIds,
  onToggleItem,
}: SourceBlockCheckboxListProps) => {
  const selectedIdSet = new Set(selectedIds);
  const isGroupSelected = (ids: string[]) => ids.every((id) => selectedIdSet.has(id));
  const toggleGroup = (ids: string[], checked: boolean) => {
    ids.forEach((id) => onToggleItem(id, checked));
  };

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const groupIds = group.items.map((item) => item.id);
        return (
          <label key={group.title} className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-foreground">
            <input
              type="checkbox"
              value={group.title}
              checked={isGroupSelected(groupIds)}
              onChange={(event) => toggleGroup(groupIds, event.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold">{group.title}</span>
              <span className="text-muted-foreground">: {group.items.map((item) => item.label).join(", ")}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
};

export type { SourceBlockCheckboxListGroup, SourceBlockCheckboxListItem, SourceBlockCheckboxListProps };
export default SourceBlockCheckboxList;
