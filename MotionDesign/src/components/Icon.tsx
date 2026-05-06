import React from "react";

type IconName =
  | "home"
  | "robot"
  | "branches"
  | "form"
  | "global"
  | "appstore"
  | "key"
  | "api"
  | "bell"
  | "setting"
  | "read"
  | "search"
  | "rocket"
  | "sliders"
  | "play"
  | "save"
  | "plus"
  | "close"
  | "check"
  | "chevron-right"
  | "chevron-down"
  | "dots"
  | "sparkle"
  | "send"
  | "file"
  | "brain"
  | "cube"
  | "menu-fold";

export const Icon: React.FC<{ name: IconName; size?: number; color?: string; strokeWidth?: number }> = ({
  name,
  size = 16,
  color = "currentColor",
  strokeWidth = 1.7,
}) => {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "home":
      return <svg {...common}><path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5Z"/></svg>;
    case "robot":
      return <svg {...common}><rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 3v4M8 11v2M16 11v2M9 17h6"/></svg>;
    case "branches":
      return <svg {...common}><circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 8v8M6 12h8"/></svg>;
    case "form":
      return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
    case "global":
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>;
    case "appstore":
      return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case "key":
      return <svg {...common}><circle cx="8" cy="15" r="4"/><path d="m10.83 12.17 8.17-8.17 2 2-2 2 2 2-3 3-2-2-1 1"/></svg>;
    case "api":
      return <svg {...common}><path d="M4 12h4M16 12h4M12 4v4M12 16v4"/><circle cx="12" cy="12" r="3"/></svg>;
    case "bell":
      return <svg {...common}><path d="M18 16V11a6 6 0 0 0-12 0v5l-2 2h16l-2-2zM10 20a2 2 0 0 0 4 0"/></svg>;
    case "setting":
      return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>;
    case "read":
      return <svg {...common}><path d="M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2V4zM22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8V4z"/></svg>;
    case "search":
      return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>;
    case "rocket":
      return <svg {...common}><path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.8-.8.8-2.2 0-3-.8-.8-2.2-.8-3 0ZM12 15l-3-3a22 22 0 0 1 3-7 12 12 0 0 1 7-3c0 2.9-.9 5.4-3 7a22 22 0 0 1-7 3ZM9 12H4s.5-2.8 2-4c1.6-1.3 4 0 4 0M15 12v5s2.8-.5 4-2c1.3-1.6 0-4 0-4"/></svg>;
    case "sliders":
      return <svg {...common}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>;
    case "play":
      return <svg {...common} fill={color}><path d="M6 4v16l14-8L6 4z" stroke="none"/></svg>;
    case "save":
      return <svg {...common}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2ZM17 21v-8H7v8M7 3v5h8"/></svg>;
    case "plus":
      return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case "close":
      return <svg {...common}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case "check":
      return <svg {...common}><path d="m20 6-11 11-5-5"/></svg>;
    case "chevron-right":
      return <svg {...common}><path d="m9 18 6-6-6-6"/></svg>;
    case "chevron-down":
      return <svg {...common}><path d="m6 9 6 6 6-6"/></svg>;
    case "dots":
      return <svg {...common}><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>;
    case "sparkle":
      return <svg {...common}><path d="m12 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6ZM19 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3ZM5 2l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z"/></svg>;
    case "send":
      return <svg {...common}><path d="m3 11 18-8-8 18-2-8-8-2Z"/></svg>;
    case "file":
      return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 2v6h6"/></svg>;
    case "brain":
      return <svg {...common}><path d="M9 3a3 3 0 0 0-3 3v0a3 3 0 0 0-3 3v0a3 3 0 0 0 3 3v0a3 3 0 0 0 3 3v0a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3ZM15 3a3 3 0 0 1 3 3v0a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3v0a3 3 0 0 1-3 3v0a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"/></svg>;
    case "cube":
      return <svg {...common}><path d="M21 8.3V16l-9 5-9-5V8.3l9-5 9 5ZM3 8.3l9 5M21 8.3l-9 5M12 13.3v9"/></svg>;
    case "menu-fold":
      return <svg {...common}><path d="M3 6h18M3 12h12M3 18h18M19 9l-3 3 3 3"/></svg>;
  }
};
