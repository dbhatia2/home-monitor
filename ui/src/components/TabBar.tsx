"use client";

import { useState } from "react";
import { useTabContext } from "@/contexts/TabContext";

export default function TabBar() {
  const { tabs, activeTabId, setActiveTab, createTab, deleteTab, updateTab } = useTabContext();
  const [showNewTab, setShowNewTab] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [newTabBudget, setNewTabBudget] = useState("800000");
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editBudget, setEditBudget] = useState("");

  const handleCreateTab = () => {
    if (newTabName.trim() && newTabBudget) {
      createTab(newTabName.trim(), Number(newTabBudget));
      setNewTabName("");
      setNewTabBudget("800000");
      setShowNewTab(false);
    }
  };

  const handleDeleteTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    if (tabs.length > 1) {
      deleteTab(tabId);
    }
  };

  const startEditing = (e: React.MouseEvent, tabId: string, name: string, budget: number) => {
    e.stopPropagation();
    setEditingTabId(tabId);
    setEditName(name);
    setEditBudget(budget.toString());
  };

  const saveEdit = () => {
    if (editingTabId && editName.trim()) {
      updateTab(editingTabId, {
        name: editName.trim(),
        budget: Number(editBudget) || 0,
      });
      setEditingTabId(null);
    }
  };

  const handleEditBlur = (e: React.FocusEvent) => {
    // Only save if focus is leaving the edit container entirely
    const currentTarget = e.currentTarget;
    setTimeout(() => {
      if (!currentTarget.contains(document.activeElement)) {
        saveEdit();
      }
    }, 0);
  };

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#0e0e18] border-b border-gray-200 dark:border-slate-800 overflow-x-auto px-2">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`
            group relative flex items-center gap-2 px-4 py-2.5 min-w-[180px] cursor-pointer
            transition-all border-b-2 hover:bg-gray-200 dark:hover:bg-slate-800/30
            ${activeTabId === tab.id
              ? 'bg-white dark:bg-[#09090f] border-emerald-500 text-slate-800 dark:text-slate-200'
              : 'border-transparent text-slate-600 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }
          `}
        >
          {editingTabId === tab.id ? (
            <div className="flex-1 flex flex-col gap-1" onClick={(e) => e.stopPropagation()} onBlur={handleEditBlur}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs px-1 py-0.5 rounded border border-gray-300 dark:border-slate-700 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <input
                type="number"
                value={editBudget}
                onChange={(e) => setEditBudget(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                placeholder="Budget"
                className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 text-[10px] px-1 py-0.5 rounded border border-gray-300 dark:border-slate-700 focus:outline-none focus:border-emerald-500"
              />
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{tab.name}</div>
                <div className="text-[10px] text-slate-600">
                  ${(tab.budget / 1000).toFixed(0)}K budget
                </div>
              </div>

              <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                <button
                  onClick={(e) => startEditing(e, tab.id, tab.name, tab.budget)}
                  className="p-1 hover:bg-slate-700 rounded"
                  title="Edit tab"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteTab(e, tab.id)}
                    className="p-1 hover:bg-red-900/30 hover:text-red-400 rounded"
                    title="Close tab"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ))}

      {/* New Tab Button */}
      {showNewTab ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col gap-1">
            <input
              type="text"
              placeholder="Tab name"
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTab()}
              className="bg-slate-900 text-slate-200 text-xs px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-emerald-500 w-32"
              autoFocus
            />
            <input
              type="number"
              placeholder="Budget"
              value={newTabBudget}
              onChange={(e) => setNewTabBudget(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTab()}
              className="bg-slate-900 text-slate-400 text-[10px] px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-emerald-500 w-32"
            />
          </div>
          <button
            onClick={handleCreateTab}
            className="p-1 bg-emerald-500 hover:bg-emerald-600 rounded text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={() => setShowNewTab(false)}
            className="p-1 hover:bg-slate-700 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowNewTab(true)}
          className="p-2.5 hover:bg-slate-800/50 text-slate-500 hover:text-slate-300 transition-colors"
          title="New tab"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </div>
  );
}
