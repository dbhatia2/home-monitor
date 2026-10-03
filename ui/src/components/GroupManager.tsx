"use client";

import { useState } from "react";
import { useTabContext } from "@/contexts/TabContext";

const GROUP_COLORS = [
  "#10B981", // emerald
  "#3B82F6", // blue
  "#F59E0B", // amber
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#14B8A6", // teal
  "#F97316", // orange
  "#06B6D4", // cyan
  "#EF4444", // red
  "#84CC16", // lime
];

export default function GroupManager() {
  const { activeTab, createGroup, deleteGroup, updateTab } = useTabContext();
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedColor, setSelectedColor] = useState(GROUP_COLORS[0]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  if (!activeTab) return null;

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      createGroup(newGroupName.trim(), selectedColor);
      setNewGroupName("");
      setSelectedColor(GROUP_COLORS[0]);
      setShowNewGroup(false);
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    if (activeTab.groups.length > 1) {
      deleteGroup(groupId);
    }
  };

  const startEditing = (groupId: string, name: string) => {
    setEditingGroupId(groupId);
    setEditName(name);
  };

  const saveEdit = () => {
    if (editingGroupId && editName.trim() && activeTab) {
      updateTab(activeTab.id, {
        groups: activeTab.groups.map(g =>
          g.id === editingGroupId ? { ...g, name: editName.trim() } : g
        ),
      });
      setEditingGroupId(null);
    }
  };

  const updateGroupColor = (groupId: string, color: string) => {
    if (activeTab) {
      updateTab(activeTab.id, {
        groups: activeTab.groups.map(g =>
          g.id === groupId ? { ...g, color } : g
        ),
      });
    }
  };

  return (
    <div className="bg-white dark:bg-[#0e0e18] border border-gray-200 dark:border-slate-800 rounded-xl p-5 mb-6">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">House Groups</h3>

      <div className="space-y-2">
        {activeTab.groups.map((group) => (
          <div
            key={group.id}
            className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900 transition-colors"
          >
            {editingGroupId === group.id ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  className="flex-1 bg-slate-800 text-slate-200 text-sm px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-1">
                <div className="relative group/color">
                  <div
                    className="w-5 h-5 rounded cursor-pointer"
                    style={{ backgroundColor: group.color }}
                  />
                  <div className="absolute top-7 left-0 hidden group-hover/color:block bg-slate-800 p-2 rounded-lg shadow-xl z-10 border border-slate-700">
                    <div className="grid grid-cols-5 gap-1.5">
                      {GROUP_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => updateGroupColor(group.id, color)}
                          className="w-6 h-6 rounded hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-300">{group.name}</div>
                  <div className="text-xs text-slate-600">
                    {group.homeIds.length} {group.homeIds.length === 1 ? 'home' : 'homes'}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-1">
              {editingGroupId !== group.id && (
                <>
                  <button
                    onClick={() => startEditing(group.id, group.name)}
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300"
                    title="Rename group"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  {activeTab.groups.length > 1 && (
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="p-1.5 hover:bg-red-900/30 rounded text-slate-500 hover:text-red-400"
                      title="Delete group"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {/* New Group Form */}
        {showNewGroup ? (
          <div className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-lg">
            <div className="relative group/color">
              <div
                className="w-5 h-5 rounded cursor-pointer"
                style={{ backgroundColor: selectedColor }}
              />
              <div className="absolute top-7 left-0 hidden group-hover/color:block bg-slate-800 p-2 rounded-lg shadow-xl z-10 border border-slate-700">
                <div className="grid grid-cols-5 gap-1.5">
                  {GROUP_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className="w-6 h-6 rounded hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <input
              type="text"
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
              className="flex-1 bg-slate-800 text-slate-200 text-sm px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            <button
              onClick={handleCreateGroup}
              className="p-1.5 bg-emerald-500 hover:bg-emerald-600 rounded text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={() => setShowNewGroup(false)}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewGroup(true)}
            className="w-full p-3 border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-lg text-slate-600 hover:text-slate-400 text-sm transition-colors"
          >
            + Add Group
          </button>
        )}
      </div>
    </div>
  );
}
