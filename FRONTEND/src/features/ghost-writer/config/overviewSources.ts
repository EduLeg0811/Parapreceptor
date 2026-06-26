export interface OverviewSourceItem {
  id: string;
  label: string;
}

export interface OverviewSourceGroup {
  title: string;
  items: OverviewSourceItem[];
}

export const OVERVIEW_SOURCE_GROUPS: OverviewSourceGroup[] = [
  {
    title: "Manuais",
    items: [
      { id: "tnp", label: "Tenepes" },
      { id: "proexis", label: "Proexis" },
      { id: "dupla", label: "Dupla" },
    ],
  },
  {
    title: "Livros",
    items: [
      { id: "200teat", label: "200 Teaticas" },
      { id: "temas", label: "Temas" },
      { id: "ccg", label: "Conscienciograma" },
    ],
  },
  {
    title: "Tratados",
    items: [
      { id: "proj", label: "Projeciologia" },
      { id: "700exp", label: "700 Experimentos" },
      { id: "hsr", label: "HSR" },
      { id: "hsp", label: "HSP" },
    ],
  },
  {
    title: "Enciclopedia",
    items: [
      { id: "ec", label: "Enciclopedia da Conscienciologia" },
    ],
  },
  {
    title: "Avançados",
    items: [
      { id: "dac", label: "DAC" },
      { id: "lo", label: "LO" },
    ],
  },
  {
    title: "Mini",
    items: [
      { id: "quest", label: "Quest" },
      { id: "mini_arlindo", label: "Mini Arlindo" },
    ],
  },
  {
    title: "Extras",
    items: [
      { id: "zefiro", label: "Zefiro" },
    ],
  },
  {
    title: "Edições Antigas",
    items: [
      { id: "proj1986", label: "Projeciologia (1986)" },
    ],
  },
];

export const ALL_OVERVIEW_SOURCE_IDS = OVERVIEW_SOURCE_GROUPS.flatMap((group) => group.items.map((item) => item.id));

const DEFAULT_UNSELECTED_TITLES = new Set(["Mini", "Extras", "Edições Antigas"]);

export const DEFAULT_OVERVIEW_SOURCE_IDS = OVERVIEW_SOURCE_GROUPS
  .filter((group) => !DEFAULT_UNSELECTED_TITLES.has(group.title))
  .flatMap((group) => group.items.map((item) => item.id));