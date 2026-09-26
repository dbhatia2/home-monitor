"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Home } from "@/lib/types";

export interface TabGroup {
  id: string;
  name: string;
  color: string;
  homeIds: number[];
}

export interface Tab {
  id: string;
  name: string;
  budget: number;
  groups: TabGroup[];
}

interface TabContextType {
  tabs: Tab[];
  activeTabId: string;
  activeTab: Tab | null;
  createTab: (name: string, budget: number) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  deleteTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  addHomeToGroup: (homeId: number, groupId: string) => void;
  removeHomeFromGroup: (homeId: number, groupId: string) => void;
  createGroup: (name: string, color: string) => void;
  deleteGroup: (groupId: string) => void;
  getTabTotal: (tabId: string, homes: Home[]) => number;
  isHomeInTab: (homeId: number) => boolean;
}

const TabContext = createContext<TabContextType | null>(null);

const TAB_COLORS = [
  "#10B981", // emerald
  "#3B82F6", // blue
  "#F59E0B", // amber
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#14B8A6", // teal
  "#F97316", // orange
  "#06B6D4", // cyan
];

export function TabProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("home-monitor-tabs");
    const savedActive = localStorage.getItem("home-monitor-active-tab");

    if (saved) {
      const parsed = JSON.parse(saved);
      setTabs(parsed);
      if (savedActive && parsed.find((t: Tab) => t.id === savedActive)) {
        setActiveTabId(savedActive);
      } else if (parsed.length > 0) {
        setActiveTabId(parsed[0].id);
      }
    } else {
      // Create default tab
      const defaultTab: Tab = {
        id: crypto.randomUUID(),
        name: "My Homes",
        budget: 800000,
        groups: [{
          id: crypto.randomUUID(),
          name: "Favorites",
          color: TAB_COLORS[0],
          homeIds: [],
        }],
      };
      setTabs([defaultTab]);
      setActiveTabId(defaultTab.id);
    }
  }, []);

  // Save to localStorage whenever tabs change
  useEffect(() => {
    if (tabs.length > 0) {
      localStorage.setItem("home-monitor-tabs", JSON.stringify(tabs));
      localStorage.setItem("home-monitor-active-tab", activeTabId);
    }
  }, [tabs, activeTabId]);

  const activeTab = tabs.find(t => t.id === activeTabId) || null;

  const createTab = (name: string, budget: number) => {
    const newTab: Tab = {
      id: crypto.randomUUID(),
      name,
      budget,
      groups: [{
        id: crypto.randomUUID(),
        name: "Group 1",
        color: TAB_COLORS[0],
        homeIds: [],
      }],
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const updateTab = (id: string, updates: Partial<Tab>) => {
    setTabs(tabs.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTab = (id: string) => {
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id && newTabs.length > 0) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const createGroup = (name: string, color: string) => {
    if (!activeTab) return;
    const newGroup: TabGroup = {
      id: crypto.randomUUID(),
      name,
      color,
      homeIds: [],
    };
    updateTab(activeTab.id, {
      groups: [...activeTab.groups, newGroup],
    });
  };

  const deleteGroup = (groupId: string) => {
    if (!activeTab) return;
    updateTab(activeTab.id, {
      groups: activeTab.groups.filter(g => g.id !== groupId),
    });
  };

  const addHomeToGroup = (homeId: number, groupId: string) => {
    if (!activeTab) return;
    updateTab(activeTab.id, {
      groups: activeTab.groups.map(g =>
        g.id === groupId && !g.homeIds.includes(homeId)
          ? { ...g, homeIds: [...g.homeIds, homeId] }
          : g
      ),
    });
  };

  const removeHomeFromGroup = (homeId: number, groupId: string) => {
    if (!activeTab) return;
    updateTab(activeTab.id, {
      groups: activeTab.groups.map(g =>
        g.id === groupId
          ? { ...g, homeIds: g.homeIds.filter(id => id !== homeId) }
          : g
      ),
    });
  };

  const getTabTotal = (tabId: string, homes: Home[]) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return 0;

    const allHomeIds = new Set(tab.groups.flatMap(g => g.homeIds));
    return homes
      .filter(h => allHomeIds.has(h.id))
      .reduce((sum, h) => sum + h.price, 0);
  };

  const isHomeInTab = (homeId: number) => {
    if (!activeTab) return false;
    return activeTab.groups.some(g => g.homeIds.includes(homeId));
  };

  return (
    <TabContext.Provider value={{
      tabs,
      activeTabId,
      activeTab,
      createTab,
      updateTab,
      deleteTab,
      setActiveTab: setActiveTabId,
      addHomeToGroup,
      removeHomeFromGroup,
      createGroup,
      deleteGroup,
      getTabTotal,
      isHomeInTab,
    }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTabContext() {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error("useTabContext must be used within TabProvider");
  }
  return context;
}
