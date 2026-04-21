export const theme = {
  color: {
    brand: "#e61982",
    brandHover: "#d0167a",
    brandLight: "#fdf2f8",
    brandSoft: "#fce7f3",
    success: "#16a34a",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#0ea5e9",
    bg: "#f8f8f8",
    bgCard: "#ffffff",
    bgDark: "#0b0b12",
    bgDeep: "#05050a",
    grid: "#e8e8e8",
    border: "#e5e7eb",
    borderSoft: "#f0f0f0",
    text: "#1f2937",
    textMuted: "#6b7280",
    textSubtle: "#9ca3af",
    nodeConnection: "#b1b1b7",
  },
  radius: {
    sm: 8,
    md: 10,
    lg: 14,
    xl: 20,
  },
  shadow: {
    card: "0 1px 4px rgba(0,0,0,0.04)",
    soft: "0 8px 24px rgba(0,0,0,0.06)",
    big: "0 20px 60px rgba(0,0,0,0.12)",
    brand: "0 4px 16px rgba(230,25,130,0.28)",
    brandBig: "0 16px 48px rgba(230,25,130,0.32)",
  },
  font: {
    family: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
};

export const agents = [
  { id: "tim", name: "Tim", role: "Explorateur web", color: "#1890ff", emoji: "🌐" },
  { id: "ada", name: "Ada", role: "Analyste données", color: "#13c2c2", emoji: "📊" },
  { id: "donald", name: "Donald", role: "Rédacteur", color: "#722ed1", emoji: "✒️" },
  { id: "denis", name: "Denis", role: "Généraliste", color: "#e61982", emoji: "📚" },
  { id: "van", name: "Van", role: "Archiviste mémoire", color: "#fa8c16", emoji: "🧠" },
  { id: "hypatie", name: "Hypatie", role: "Doc projet", color: "#52c41a", emoji: "🏛️" },
  { id: "alan", name: "Alan", role: "Exécuteur code", color: "#2f54eb", emoji: "⚙️" },
  { id: "rene", name: "René", role: "Logicien", color: "#595959", emoji: "🧩" },
  { id: "hedy", name: "Hedy", role: "Vision", color: "#eb2f96", emoji: "👁️" },
  { id: "graham", name: "Graham", role: "Voix", color: "#d46b08", emoji: "🎤" },
  { id: "marie", name: "Marie", role: "Data scientist", color: "#cf1322", emoji: "🔬" },
  { id: "florence", name: "Florence", role: "Dataviz", color: "#ff70a6", emoji: "📈" },
  { id: "isaac", name: "Isaac", role: "Architecte", color: "#531dab", emoji: "🤖" },
  { id: "claude", name: "Claude", role: "Auditeur sécurité", color: "#434343", emoji: "🔒" },
] as const;

export type Agent = (typeof agents)[number];
