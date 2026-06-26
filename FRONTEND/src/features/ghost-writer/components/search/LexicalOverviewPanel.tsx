import OverviewSearchPanel from "@/features/ghost-writer/components/search/OverviewSearchPanel";

interface LexicalOverviewPanelProps {
  title: string;
  description: string;
  term: string;
  maxResults: number;
  selectedSourceIds: string[];
  queryLabel?: string;
  onToggleSource: (id: string, checked: boolean) => void;
  onTermChange: (value: string) => void;
  onMaxResultsChange: (value: number) => void;
  onRunSearch: () => void;
  isRunning: boolean;
  onClose?: () => void;
  showPanelChrome?: boolean;
}

const LexicalOverviewPanel = (props: LexicalOverviewPanelProps) => (
  <OverviewSearchPanel
    {...props}
    queryLabel={props.queryLabel ?? "Termo"}
  />
);

export default LexicalOverviewPanel;

