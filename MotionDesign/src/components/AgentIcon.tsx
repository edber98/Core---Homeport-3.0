import React from "react";
import {
  Globe,
  BarChart3,
  PenTool,
  Users,
  Brain,
  BookOpen,
  Terminal,
  GitBranch,
  Eye,
  Mic,
  Microscope,
  LineChart,
  Network,
  ShieldCheck,
  Shield,
  Scale,
  Rocket,
  Lock,
  Key,
  Zap,
  Mail,
  ClipboardList,
  Settings,
  Bot,
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  CreditCard,
  Building2,
  Briefcase,
  FlaskConical,
  CircleCheck,
  Database,
  TrendingUp,
  Layers,
  Cpu,
  ArrowRight,
  FileText,
  Code2,
  ScanText,
  Play,
  Save,
  ChevronRight,
} from "lucide-react";

const ICONS: Record<string, any> = {
  // Agents
  tim: Globe,
  ada: BarChart3,
  donald: PenTool,
  denis: Users,
  van: Brain,
  hypatie: BookOpen,
  alan: Terminal,
  rene: GitBranch,
  hedy: Eye,
  graham: Mic,
  marie: Microscope,
  florence: LineChart,
  isaac: Network,
  claude: ShieldCheck,

  // Permissions / autonomy
  shield: Shield,
  scale: Scale,
  rocket: Rocket,

  // Confidentiality
  lock: Lock,
  key: Key,
  zap: Zap,

  // Generic
  mail: Mail,
  clipboard: ClipboardList,
  settings: Settings,
  bot: Bot,
  sparkles: Sparkles,
  send: Send,
  check: CheckCircle2,
  clock: Clock,
  creditCard: CreditCard,
  building: Building2,
  briefcase: Briefcase,
  flask: FlaskConical,
  circleCheck: CircleCheck,
  database: Database,
  trendingUp: TrendingUp,
  layers: Layers,
  cpu: Cpu,
  arrowRight: ArrowRight,
  file: FileText,
  code: Code2,
  scan: ScanText,
  play: Play,
  save: Save,
  chevronRight: ChevronRight,
};

export type IconName = keyof typeof ICONS;

// Wrapper that renders a lucide-react icon, used throughout the pitch in place of emojis.
export const LucideIcon: React.FC<{
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}> = ({ name, size = 20, color = "currentColor", strokeWidth = 2 }) => {
  const Component = ICONS[name];
  if (!Component) return null;
  return <Component size={size} color={color} strokeWidth={strokeWidth} />;
};

// Helper: get the agent icon name from an agent id.
export const AGENT_ICON: Record<string, IconName> = {
  tim: "tim",
  ada: "ada",
  donald: "donald",
  denis: "denis",
  van: "van",
  hypatie: "hypatie",
  alan: "alan",
  rene: "rene",
  hedy: "hedy",
  graham: "graham",
  marie: "marie",
  florence: "florence",
  isaac: "isaac",
  claude: "claude",
};
