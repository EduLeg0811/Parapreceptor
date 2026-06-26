import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sectionActionButtonClass } from "@/styles/buttonStyles";

interface ApplicationsLinksPanelProps {
  isLoading: boolean;
  onRunRandomPensata: () => void;
}

const linkClassName = "group block rounded-xl border border-orange-200 bg-white px-4 py-2 text-blue-600 shadow-sm transition-all duration-200 hover:bg-white hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-[0_10px_24px_-14px_rgba(0,0,0,0.45),0_3px_8px_-4px_rgba(0,0,0,0.25)]";

const ApplicationsLinksPanel = ({ isLoading, onRunRandomPensata }: ApplicationsLinksPanelProps) => (
  <div className="scrollbar-thin h-full min-h-0 overflow-y-auto p-4">
    <div className="space-y-3">
      <Button
        variant="ghost"
        className={`${sectionActionButtonClass} group flex items-center justify-between rounded-xl border border-orange-200 bg-white px-4 py-2 text-blue-600 shadow-sm transition-all duration-200 hover:!bg-white hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-[0_10px_24px_-14px_rgba(0,0,0,0.45),0_3px_8px_-4px_rgba(0,0,0,0.25)]`}
        onClick={onRunRandomPensata}
        disabled={isLoading}
      >
        <img src="/LO.png" alt="LO" className="h-14 w-16 shrink-0 object-contain bg-white" />
        <span className="min-w-0 flex-1 text-left">
          <span className="text-sm font-semibold tracking-wide text-orange-600 shadow-lg">Pensata do Dia</span>
          <p className="text-[11px] leading-tight text-blue-600 shadow-lg">Bibliomancia Digital</p>
        </span>
      </Button>

      <a href="https://cons-ia.org/" target="_blank" rel="noopener noreferrer" className={linkClassName}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <img src="/cons-ia.png" alt="Cons-IA" className="h-14 w-14 rounded-md" />
            <span className="min-w-0 flex-1 text-left">
              <span className="text-sm font-semibold tracking-wide text-orange-600 shadow-lg">Cons-IA</span>
              <p className="text-[11px] leading-tight text-blue-600 shadow-lg">Toolbox de IA da Conscienciologia</p>
            </span>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 opacity-90 transition group-hover:translate-x-0.5" />
        </div>
      </a>

      <a href="https://verbetograma.streamlit.app/" target="_blank" rel="noopener noreferrer" className={linkClassName}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <img src="/DictLookUp.png" alt="Dicionários" className="h-14 w-16 rounded-md object-contain" />
            <span className="min-w-0 flex-1 text-left">
              <span className="text-sm font-semibold tracking-wide text-orange-600 shadow-lg">Verbetograma</span>
              <p className="text-[11px] leading-tight text-blue-600 shadow-lg">Revisão verbetográfica</p>
            </span>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 opacity-90 transition group-hover:translate-x-0.5" />
        </div>
      </a>

      <a href="https://lexicons-g86o.onrender.com/" target="_blank" rel="noopener noreferrer" className={linkClassName}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <img src="/Lexicons.png" alt="LexiCons" className="h-14 w-16 rounded-md object-contain" />
            <span className="min-w-0 flex-1 text-left">
              <span className="text-sm font-semibold tracking-wide text-orange-600 shadow-lg">LexiCons</span>
              <p className="text-[11px] leading-tight text-blue-600 shadow-lg">Dicionário Analógico e Sinônimos</p>
            </span>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 opacity-90 transition group-hover:translate-x-0.5" />
        </div>
      </a>

      <a
        href="https://www.dropbox.com/scl/fo/qh87067rpgc7ndjpv50eb/AGWrUeEVDyDZRlOWqDNcJ00?rlkey=jw6lkzp9fkugkamcx500z0k9g&st=owkldr8v&dl=0"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <img src="/Books.png" alt="PDF" className="h-14 w-16 rounded-md" />
            <span className="min-w-0 flex-1 text-left">
              <span className="text-sm font-semibold tracking-wide text-orange-600 shadow-lg">Livros em PDF</span>
              <p className="text-[11px] leading-tight text-blue-600 shadow-lg">Download de livros da Conscienciologia</p>
            </span>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 opacity-90 transition group-hover:translate-x-0.5" />
        </div>
      </a>

      <a href="https://consciencioteca.onrender.com/" target="_blank" rel="noopener noreferrer" className={linkClassName}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <img src="/WV-Green3.png" alt="Videos" className="h-12 w-16 rounded-md" />
            <span className="min-w-0 flex-1 text-left">
              <span className="text-sm font-semibold tracking-wide text-orange-600 shadow-lg">Consciencioteca</span>
              <p className="text-[11px] leading-tight text-blue-600 shadow-lg">Canal de videos da Conscienciologia</p>
            </span>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 opacity-90 transition group-hover:translate-x-0.5" />
        </div>
      </a>
    </div>
  </div>
);

export default ApplicationsLinksPanel;
