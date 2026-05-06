export const REPORT_REASONS = [
  { value: "spam",          label: "Spam o publicidad no deseada" },
  { value: "ofensivo",      label: "Contenido ofensivo o acoso" },
  { value: "desinformacion",label: "Desinformación o noticias falsas" },
  { value: "ilegal",        label: "Contenido ilegal" },
  { value: "otro",          label: "Otro motivo" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];
