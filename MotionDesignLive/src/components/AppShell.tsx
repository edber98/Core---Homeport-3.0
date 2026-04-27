import React from "react";
import { Img, staticFile } from "remotion";
import { theme } from "../theme";
import { Icon } from "./Icon";

type NavItem = { label: string; icon: React.ReactNode; active?: boolean };

const defaultNav: NavItem[] = [
  { label: "Dashboard", icon: <Icon name="home" size={17} /> },
  { label: "Assistant IA", icon: <Icon name="robot" size={17} />, active: true },
  { label: "Flows", icon: <Icon name="branches" size={17} /> },
  { label: "Formulaires", icon: <Icon name="form" size={17} /> },
  { label: "Sites web", icon: <Icon name="global" size={17} /> },
  { label: "Templates de nœuds", icon: <Icon name="appstore" size={17} /> },
  { label: "Credentials", icon: <Icon name="key" size={17} /> },
  { label: "Apps / Providers", icon: <Icon name="api" size={17} /> },
  { label: "Notifications", icon: <Icon name="bell" size={17} /> },
  { label: "Paramètres", icon: <Icon name="setting" size={17} /> },
];

// Replica fidèle du layout-main.html / .scss
export const AppShell: React.FC<{
  nav?: NavItem[];
  children: React.ReactNode;
  userInitials?: string;
  searchValue?: string;
  showHeader?: boolean;
}> = ({ nav = defaultNav, children, userInitials = "EB", searchValue = "", showHeader = true }) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        background: "#f8f8f8",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* ═══ SIDEBAR ═══ */}
      <aside
        style={{
          width: 230,
          minWidth: 230,
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          padding: 6,
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px 12px 12px",
          }}
        >
          <Img
            src={staticFile("logo-kinn.svg")}
            style={{ height: 24, width: "auto", objectFit: "contain" }}
          />
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "4px 0", display: "flex", flexDirection: "column", gap: 1 }}>
          {nav.map((item, idx) => {
            const active = !!item.active;
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "9px 14px",
                  borderRadius: 10,
                  color: active ? "#fff" : "#8b8b8b",
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  background: active ? "#e61982" : "transparent",
                  boxShadow: active ? "0 2px 10px rgba(230,25,130,0.3)" : "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    fontSize: 17,
                    width: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: active ? "#fff" : "#8b8b8b",
                  }}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>

        {/* Toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 38,
            margin: "4px 0 2px",
            borderRadius: 10,
            color: "#8b8b8b",
            fontSize: 15,
          }}
        >
          <Icon name="menu-fold" size={17} />
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
          borderRadius: "18px 0 0 18px",
          background: "#f8f8f8",
        }}
      >
        {showHeader && (
          <header
            style={{
              display: "flex",
              alignItems: "center",
              height: 52,
              padding: "0 16px",
              flexShrink: 0,
              background: "transparent",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, zIndex: 1 }} />

            {/* Search bar (centered absolute) */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: 480,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  height: 36,
                  background: "#fff",
                  borderRadius: 14,
                  padding: "0 12px",
                  gap: 8,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <span style={{ color: "#c0c0c0", display: "flex" }}>
                  <Icon name="search" size={13} />
                </span>
                <div style={{ flex: 1, fontSize: 13, color: searchValue ? "#1a1a1a" : "#c4c4c4" }}>
                  {searchValue || "Rechercher un flow, formulaire…"}
                </div>
                <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                </div>
              </div>
            </div>

            {/* Right icons */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", zIndex: 1 }}>
              <HdrIconBtn><Icon name="rocket" size={14} color="#8b8b8b" /></HdrIconBtn>
              <HdrIconBtn><Icon name="sliders" size={14} color="#8b8b8b" /></HdrIconBtn>
              <HdrIconBtn variant="ai"><Icon name="robot" size={14} color="#fff" /></HdrIconBtn>
              <HdrIconBtn>
                <Icon name="bell" size={14} color="#8b8b8b" />
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    minWidth: 16,
                    height: 16,
                    padding: "0 4px",
                    borderRadius: 999,
                    background: "#e61982",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 0 2px #f8f8f8",
                  }}
                >
                  3
                </span>
              </HdrIconBtn>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    background: "#e61982",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  {userInitials}
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Content */}
        <main style={{ flex: 1, position: "relative", overflow: "hidden" }}>{children}</main>
      </div>
    </div>
  );
};

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      height: 20,
      minWidth: 20,
      padding: "0 5px",
      background: "#f8f8f8",
      borderRadius: 5,
      fontSize: 10,
      fontWeight: 600,
      color: "#b0b0b0",
    }}
  >
    {children}
  </span>
);

const HdrIconBtn: React.FC<{ children: React.ReactNode; variant?: "default" | "ai" }> = ({ children, variant = "default" }) => {
  const ai = variant === "ai";
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        borderRadius: 10,
        background: ai ? "#e61982" : "#fff",
        color: ai ? "#fff" : "#8b8b8b",
        fontSize: 14,
        boxShadow: ai ? "0 2px 8px rgba(230,25,130,0.2)" : "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      {children}
    </div>
  );
};
