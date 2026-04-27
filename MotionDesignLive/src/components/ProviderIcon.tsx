import React from "react";

export type ProviderKey =
  | "odoo"
  | "slack"
  | "hubspot"
  | "stripe"
  | "github"
  | "gmail"
  | "salesforce"
  | "quickbooks"
  | "notion"
  | "mcp";

const providers: Record<ProviderKey, { label: string; bg: string; fg: string; mark: string }> = {
  odoo: { label: "Odoo", bg: "#714b67", fg: "#fff", mark: "O" },
  slack: { label: "Slack", bg: "#4a154b", fg: "#ecb22e", mark: "#" },
  hubspot: { label: "HubSpot", bg: "#ff7a59", fg: "#fff", mark: "H" },
  stripe: { label: "Stripe", bg: "#635bff", fg: "#fff", mark: "S" },
  github: { label: "GitHub", bg: "#24292e", fg: "#fff", mark: "◎" },
  gmail: { label: "Gmail", bg: "#ea4335", fg: "#fff", mark: "M" },
  salesforce: { label: "Salesforce", bg: "#00a1e0", fg: "#fff", mark: "☁" },
  quickbooks: { label: "QuickBooks", bg: "#2ca01c", fg: "#fff", mark: "Q" },
  notion: { label: "Notion", bg: "#000", fg: "#fff", mark: "N" },
  mcp: { label: "MCP", bg: "#0b0b12", fg: "#f59e0b", mark: "⚡" },
};

export const ProviderIcon: React.FC<{
  provider: ProviderKey;
  size?: number;
  showLabel?: boolean;
  opacity?: number;
}> = ({ provider, size = 64, showLabel = false, opacity = 1 }) => {
  const p = providers[provider];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, opacity }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.22,
          background: p.bg,
          color: p.fg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.5,
          fontWeight: 800,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        }}
      >
        {p.mark}
      </div>
      {showLabel && (
        <div style={{ fontSize: 14, fontWeight: 500, color: "#1f2937" }}>{p.label}</div>
      )}
    </div>
  );
};

export const allProviders: ProviderKey[] = [
  "odoo",
  "slack",
  "hubspot",
  "stripe",
  "github",
  "gmail",
  "salesforce",
  "quickbooks",
  "notion",
  "mcp",
];
