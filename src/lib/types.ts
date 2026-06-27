export type StickerSection = 'apertura' | 'museum' | 'team';
export type StickerKind = 'foil' | 'photo' | 'player' | 'special';

export type Sticker = {
  id: string;
  code: string;
  label: string;
  section: StickerSection;
  teamId?: string;
  number: number;
  kind: StickerKind;
};

export type Team = {
  id: string;
  code: string;
  name: string;
  group: string;
  confederation: string;
  slug: string;
};

export type Collection = Record<string, number>;

export type SectionProgress = {
  owned: number;
  total: number;
  percent: number;
};

export type TeamProgress = SectionProgress & {
  team: Team;
  missing: Sticker[];
  duplicates: { sticker: Sticker; extra: number }[];
};

export type GlobalProgress = {
  owned: number;
  total: number;
  percent: number;
  missing: Sticker[];
  duplicates: { sticker: Sticker; extra: number }[];
  bySection: Record<StickerSection, SectionProgress>;
};
