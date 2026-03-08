import React, { useState, useRef, useEffect } from 'react';
import { useLeague } from '../LeagueContext';
import { calc9HoleHandicap, teeTimes, courseHoles, moneyCategories } from '../constants';

export default function AdminPage() {
  const {
    players, weeks, selectedWeek, setSelectedWeek,
    currentWeek, currentGame,
    isAdminAuthenticated, setIsAdminAuthenticated,
    adminPassword, setAdminPassword, passwordError, setPasswordError,
    handleAdminLogin,
    // Schedule builder
    showScheduleBuilder, setShowScheduleBuilder,
    scheduleSelections, setScheduleSelections,
    dragPlayer, setDragPlayer, dragOverSlot, setDragOverSlot,
    assignedPlayerIds,
    autoScheduleWeek, loadExistingSchedule, handleBuildSchedule,
    // Money entry
    showMoneyEntry, setShowMoneyEntry,
    moneyEntries, setMoneyEntries,
    handleEnterMoney, loadMoneyForEdit,
    getTeamTypeForWeek, getPlayersForWeek, getPlayerById,
    // Score management
    showScoreManager, setShowScoreManager,
    editingScore, setEditingScore,
    scoreManagerWeek, setScoreManagerWeek,
    adminAddScore, setAdminAddScore,
    playerScores, setPlayerScores,
    savePlayerScoreToSupabase, recalculateGiantSkins,
    updatePlayerScore, deletePlayerScore,
    getTeammatesForWeek,
    // Weekly games
    showWeeklyGameEditor, setShowWeeklyGameEditor,
    weeklyGameEdit, setWeeklyGameEdit,
    loadWeeklyGameForEdit, handleSaveWeeklyGame,
    // Player management
    showPlayerEditor, setShowPlayerEditor,
    editingPlayerId, setEditingPlayerId,
    playerEdit, setPlayerEdit,
    playerSearchTerm, setPlayerSearchTerm,
    filteredPlayersForAdmin,
    loadPlayerForEdit, handleSavePlayer, toggleAvailability,
    showAddPlayer, setShowAddPlayer, newPlayer, setNewPlayer,
    showRemoveConfirm, setShowRemoveConfirm,
    handleAddPlayer, handleRemovePlayer, toggleNewPlayerAvailability,
    // Giant Skins management
    giantSkins, showGiantSkinsManager, setShowGiantSkinsManager,
    giantSkinsAddForm, setGiantSkinsAddForm,
    addPlayerToGiantSkin, removePlayerFromGiantSkin, editGiantSkinType,
    // Reset
    showResetConfirm, setShowResetConfirm,
    resetWeekId, setResetWeekId,
    resetSingleWeek, resetMoneyData, resetTeeSheets, resetGiantSkins, resetPlayerScores, resetAllData,
    // Utilities
    formatDate, formatShortDate,
  } = useLeague();

  const [activeSelectSlot, setActiveSelectSlot] = useState(null);
  const selectDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!activeSelectSlot) return;
    const handleClickOutside = (e) => {
      if (selectDropdownRef.current && !selectDropdownRef.current.contains(e.target)) {
        setActiveSelectSlot(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [activeSelectSlot]);

  if (!isAdminAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="max-w-md mx-auto mt-12">
          <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
            <div className="bg-green-800 px-6 py-4 text-center">
              <div className="text-3xl mb-2">🔐</div>
              <h3 className="text-xl font-serif text-white">Admin Access</h3>
              <p className="text-green-200 text-sm">Enter password to access league administration</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => { setAdminPassword(e.target.value); setPasswordError(false); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                    placeholder="Enter admin password"
                    autoComplete="off"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    className={`w-full border rounded-lg px-4 py-3 text-center text-lg ${
                      passwordError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {passwordError && (
                    <p className="text-red-500 text-sm mt-2 text-center">Incorrect password. Try again.</p>
                  )}
                </div>
                <button
                  onClick={handleAdminLogin}
                  className="w-full bg-green-700 text-white py-3 rounded-lg hover:bg-green-800 font-medium text-lg"
                >
                  Enter Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-serif text-white">League Administration</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-green-300 text-sm">Week:</span>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
              className="px-2 py-1.5 rounded-lg bg-white font-medium text-sm max-w-[180px]"
            >
              {weeks.map(w => (
                <option key={w.id} value={w.id}>Week {w.id} - {formatShortDate(w.date)}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setIsAdminAuthenticated(false)}
            className="text-green-300 hover:text-white text-sm flex items-center gap-1 whitespace-nowrap"
          >
            🔓 Logout
          </button>
        </div>
      </div>

      {currentWeek && (
        <div className="bg-white/95 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-800">{formatDate(currentWeek.date)}</div>
              <div className={`text-sm ${currentWeek.nineHoles === 'front' ? 'text-blue-600' : 'text-purple-600'}`}>
                {currentWeek.nineHoles === 'front' ? 'Front 9 (Holes 1-9)' : 'Back 9 (Holes 10-18)'}
              </div>
            </div>
            <div className="flex gap-2">
              {currentWeek.teeSheet.length > 0 && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">✓ Scheduled</span>}
              {currentWeek.moneyEntered && <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs">✓ Money</span>}
            </div>
          </div>
        </div>
      )}

      {/* Build Schedule */}
      <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-green-800 px-4 py-3 flex items-center justify-between">
          <h3 className="text-white font-medium">📅 Build Weekly Schedule</h3>
          <div className="flex gap-2">
            {!showScheduleBuilder && (
              <>
                <button
                  onClick={autoScheduleWeek}
                  className="bg-blue-500 text-white px-4 py-1 rounded-lg hover:bg-blue-600 text-sm font-medium"
                >
                  ✨ Auto-Generate
                </button>
                <button
                  onClick={loadExistingSchedule}
                  className="bg-yellow-500 text-white px-4 py-1 rounded-lg hover:bg-yellow-600 text-sm font-medium"
                >
                  {currentWeek?.teeSheet.length ? 'Edit Schedule' : 'Manual Build'}
                </button>
              </>
            )}
          </div>
        </div>

        {showScheduleBuilder && (
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              Tap an empty slot to pick a player. Drag and drop to rearrange or swap.
              <span className="font-medium"> {48 - assignedPlayerIds.length} spots remaining.</span>
            </p>

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {teeTimes.map((time, timeIdx) => (
                <div key={timeIdx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-16 flex-shrink-0">
                    <div className="font-bold text-green-800 text-sm leading-tight">{time}</div>
                    <div className="text-xs text-gray-500">
                      {[0,1,2,3].filter(s => scheduleSelections[`${timeIdx}-${s}`]).length}/4
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map(slot => {
                      const key = `${timeIdx}-${slot}`;
                      const playerId = scheduleSelections[key];
                      const player = playerId ? players.find(p => p.id === parseInt(playerId)) : null;
                      const isDragOver = dragOverSlot === key;
                      const isDragging = dragPlayer && dragPlayer.fromKey === key;

                      if (player) {
                        return (
                          <div
                            key={slot}
                            draggable="true"
                            onDragStart={(e) => {
                              setDragPlayer({ playerId: String(player.id), fromKey: key, fromTimeIdx: timeIdx, fromSlotIdx: slot });
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={() => { setDragPlayer(null); setDragOverSlot(null); }}
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                            onDragEnter={(e) => { e.preventDefault(); setDragOverSlot(key); }}
                            onDragLeave={(e) => {
                              if (!e.currentTarget.contains(e.relatedTarget)) setDragOverSlot(null);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              setDragOverSlot(null);
                              if (!dragPlayer || dragPlayer.fromKey === key) return;
                              setScheduleSelections(prev => ({
                                ...prev,
                                [dragPlayer.fromKey]: String(player.id),
                                [key]: dragPlayer.playerId
                              }));
                              setDragPlayer(null);
                            }}
                            className={`relative bg-white px-2 py-2 rounded border text-sm font-medium text-gray-800 cursor-grab active:cursor-grabbing transition-all select-none flex items-center justify-between ${
                              isDragging ? 'opacity-40 border-gray-300' :
                              isDragOver ? 'border-green-500 bg-green-50 shadow-md' :
                              'border-gray-200 hover:border-green-400 hover:shadow-sm'
                            }`}
                          >
                            <div className="truncate">
                              <span>{player.name}</span>
                              <span className="text-xs text-gray-500 ml-1">({calc9HoleHandicap(player.handicap)})</span>
                              {player.type === 'substitute' && <span className="text-xs text-orange-500 ml-1">Sub</span>}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setScheduleSelections(prev => {
                                  const updated = { ...prev };
                                  delete updated[key];
                                  return updated;
                                });
                              }}
                              className="ml-1 text-gray-400 hover:text-red-500 text-xs font-bold flex-shrink-0"
                              title="Remove player"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      } else {
                        const isSelectOpen = activeSelectSlot === key;
                        const unassignedPlayers = players.filter(p =>
                          (p.type === 'full-time' || p.type === 'substitute') &&
                          !assignedPlayerIds.includes(p.id)
                        ).sort((a, b) => a.name.localeCompare(b.name));

                        return (
                          <div key={slot} className="relative">
                            <div
                              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                              onDragEnter={(e) => { e.preventDefault(); setDragOverSlot(key); }}
                              onDragLeave={(e) => {
                                if (!e.currentTarget.contains(e.relatedTarget)) setDragOverSlot(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                setDragOverSlot(null);
                                if (!dragPlayer) return;
                                setScheduleSelections(prev => {
                                  const updated = { ...prev };
                                  if (dragPlayer.fromKey) {
                                    delete updated[dragPlayer.fromKey];
                                  }
                                  updated[key] = dragPlayer.playerId;
                                  return updated;
                                });
                                setDragPlayer(null);
                              }}
                              onClick={() => {
                                if (dragPlayer) return;
                                setActiveSelectSlot(isSelectOpen ? null : key);
                              }}
                              className={`px-2 py-2 rounded border-2 border-dashed text-xs text-center transition-all cursor-pointer ${
                                isSelectOpen
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : isDragOver
                                  ? 'border-green-500 bg-green-50 text-green-700'
                                  : 'border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500'
                              }`}
                            >
                              {isDragOver ? 'Drop here' : isSelectOpen ? 'Select player ▲' : '+ Add Player'}
                            </div>
                            {isSelectOpen && (
                              <div
                                ref={selectDropdownRef}
                                className="absolute z-50 top-full left-0 mt-1 w-56 bg-white border border-blue-200 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                              >
                                {unassignedPlayers.length === 0 ? (
                                  <div className="px-3 py-2 text-sm text-gray-500">No available players</div>
                                ) : (
                                  unassignedPlayers.map(p => (
                                    <button
                                      key={p.id}
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2 border-b border-gray-100 last:border-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setScheduleSelections(prev => ({ ...prev, [key]: String(p.id) }));
                                        setActiveSelectSlot(null);
                                      }}
                                    >
                                      <span className="font-medium text-gray-800">{p.name}</span>
                                      <span className="text-xs text-gray-500 flex-shrink-0">
                                        ({calc9HoleHandicap(p.handicap)}){p.type === 'substitute' ? ' Sub' : ''}
                                      </span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Unassigned Player Pool */}
            {(() => {
              const unassignedPlayers = players.filter(p =>
                (p.type === 'full-time' || p.type === 'substitute') &&
                !assignedPlayerIds.includes(p.id)
              ).sort((a, b) => a.name.localeCompare(b.name));

              if (unassignedPlayers.length === 0) return null;

              return (
                <div className="mt-4 border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Available Players ({unassignedPlayers.length})
                    <span className="text-gray-500 font-normal ml-2">Tap an empty slot above or drag</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {unassignedPlayers.map(p => (
                      <div
                        key={p.id}
                        draggable="true"
                        onDragStart={(e) => {
                          setDragPlayer({ playerId: String(p.id), fromKey: null, fromTimeIdx: null, fromSlotIdx: null });
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => { setDragPlayer(null); setDragOverSlot(null); }}
                        className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full text-sm cursor-grab active:cursor-grabbing hover:bg-blue-100 hover:border-blue-300 transition-colors select-none"
                      >
                        <span className="font-medium text-blue-800">{p.name}</span>
                        <span className="text-xs text-blue-500 ml-1">({calc9HoleHandicap(p.handicap)})</span>
                        {p.type === 'substitute' && <span className="text-xs text-orange-500 ml-1">Sub</span>}
                        <span className="text-xs text-blue-400 ml-1">
                          [{p.availability.length === teeTimes.length ? 'All' : p.availability.length + ' times'}]
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleBuildSchedule}
                className="flex-1 bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 font-medium"
              >
                Save Schedule
              </button>
              <button
                onClick={() => { setShowScheduleBuilder(false); setScheduleSelections({}); setDragPlayer(null); setDragOverSlot(null); }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!showScheduleBuilder && (
          <div className="p-4 text-sm text-gray-600">
            <p><strong>Auto-Generate:</strong> Creates optimal schedule based on availability, handicap mixing, and rotation diversity.</p>
            <p><strong>Manual Build:</strong> Pick players yourself for each tee time (only shows available players).</p>
          </div>
        )}
      </div>

      {/* Enter Money */}
      <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-green-800 px-4 py-3 flex items-center justify-between">
          <h3 className="text-white font-medium">💰 Enter Weekly Money</h3>
          {!showMoneyEntry && currentWeek?.teeSheet.length > 0 && (
            currentWeek?.moneyEntered ? (
              <button
                onClick={loadMoneyForEdit}
                className="bg-blue-500 text-white px-4 py-1 rounded-lg hover:bg-blue-600 text-sm font-medium"
              >
                ✏️ Edit Money
              </button>
            ) : (
              <button
                onClick={() => setShowMoneyEntry(true)}
                className="bg-yellow-500 text-white px-4 py-1 rounded-lg hover:bg-yellow-600 text-sm font-medium"
              >
                Enter Money
              </button>
            )
          )}
        </div>

        {showMoneyEntry && currentWeek && (
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-700">🏆 Main Game</h4>
                {['1st', '2nd', '3rd'].map(place => {
                  const cat = moneyCategories.find(c => c.id === place);
                  const teamType = getTeamTypeForWeek(selectedWeek);
                  const selectedForPlace = Object.keys(moneyEntries).filter(k => k.endsWith(`-${place}`)).map(k => k.split('-')[0]);
                  const amountForPlace = Object.entries(moneyEntries).find(([k]) => k.endsWith(`-${place}`))?.[1] || '';

                  if (teamType) {
                    return (
                      <div key={place} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{cat.icon}</span>
                          <span className="font-medium text-gray-700">{cat.name}</span>
                          <div className="flex items-center ml-auto">
                            <span className="text-gray-500 text-sm">$ each</span>
                            <input
                              type="number"
                              placeholder="0"
                              value={amountForPlace}
                              onChange={(e) => {
                                const newEntries = { ...moneyEntries };
                                Object.keys(newEntries).forEach(k => {
                                  if (k.endsWith(`-${place}`)) {
                                    newEntries[k] = e.target.value;
                                  }
                                });
                                setMoneyEntries(newEntries);
                              }}
                              className="w-20 border rounded px-2 py-1 ml-1 text-sm"
                            />
                          </div>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {getPlayersForWeek(selectedWeek).map(id => {
                            const p = getPlayerById(id);
                            const isChecked = selectedForPlace.includes(String(id));
                            return (
                              <label key={id} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm ${isChecked ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const newEntries = { ...moneyEntries };
                                    if (e.target.checked) {
                                      newEntries[`${id}-${place}`] = amountForPlace;
                                    } else {
                                      delete newEntries[`${id}-${place}`];
                                    }
                                    setMoneyEntries(newEntries);
                                  }}
                                  className="rounded border-gray-300 text-green-600"
                                />
                                <span className={isChecked ? 'font-medium text-green-800' : 'text-gray-700'}>{p?.name}</span>
                              </label>
                            );
                          })}
                        </div>
                        {selectedForPlace.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">{selectedForPlace.length} player{selectedForPlace.length !== 1 ? 's' : ''} selected</div>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div key={place} className="flex items-center gap-3">
                        <span className="text-xl w-8">{cat.icon}</span>
                        <select
                          value={selectedForPlace[0] || ''}
                          onChange={(e) => {
                            const newEntries = { ...moneyEntries };
                            Object.keys(newEntries).forEach(k => {
                              if (k.endsWith(`-${place}`)) delete newEntries[k];
                            });
                            if (e.target.value) {
                              newEntries[`${e.target.value}-${place}`] = moneyEntries[`${e.target.value}-${place}`] || '';
                            }
                            setMoneyEntries(newEntries);
                          }}
                          className="flex-1 border rounded px-2 py-1"
                        >
                          <option value="">Select player...</option>
                          {getPlayersForWeek(selectedWeek).map(id => {
                            const p = getPlayerById(id);
                            return <option key={id} value={id}>{p?.name}</option>;
                          })}
                        </select>
                        <div className="flex items-center">
                          <span className="text-gray-500">$</span>
                          <input
                            type="number"
                            placeholder="0"
                            value={amountForPlace}
                            onChange={(e) => {
                              const newEntries = { ...moneyEntries };
                              Object.keys(newEntries).forEach(k => {
                                if (k.endsWith(`-${place}`)) {
                                  newEntries[k] = e.target.value;
                                }
                              });
                              setMoneyEntries(newEntries);
                            }}
                            className="w-20 border rounded px-2 py-1"
                          />
                        </div>
                      </div>
                    );
                  }
                })}
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-gray-700">🎯 Closest to Pin</h4>
                {['ctp1', 'ctp2', 'ctp3'].map((ctp, idx) => (
                  <div key={ctp} className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 w-8">#{idx + 1}</span>
                    <select
                      value={Object.keys(moneyEntries).find(k => k.endsWith(`-${ctp}`))?.split('-')[0] || ''}
                      onChange={(e) => {
                        const newEntries = { ...moneyEntries };
                        Object.keys(newEntries).forEach(k => {
                          if (k.endsWith(`-${ctp}`)) delete newEntries[k];
                        });
                        if (e.target.value) {
                          newEntries[`${e.target.value}-${ctp}`] = moneyEntries[`${e.target.value}-${ctp}`] || '';
                        }
                        setMoneyEntries(newEntries);
                      }}
                      className="flex-1 border rounded px-2 py-1"
                    >
                      <option value="">Select player...</option>
                      {getPlayersForWeek(selectedWeek).map(id => {
                        const p = getPlayerById(id);
                        return <option key={id} value={id}>{p.name}</option>;
                      })}
                    </select>
                    <div className="flex items-center">
                      <span className="text-gray-500">$</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={Object.entries(moneyEntries).find(([k]) => k.endsWith(`-${ctp}`))?.[1] || ''}
                        onChange={(e) => {
                          const key = Object.keys(moneyEntries).find(k => k.endsWith(`-${ctp}`));
                          if (key) {
                            setMoneyEntries({ ...moneyEntries, [key]: e.target.value });
                          }
                        }}
                        className="w-20 border rounded px-2 py-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleEnterMoney}
                className="flex-1 bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 font-medium"
              >
                Save Money
              </button>
              <button
                onClick={() => { setShowMoneyEntry(false); setMoneyEntries({}); }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manage Player Scores */}
      <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-green-800 px-4 py-3 flex items-center justify-between">
          <h3 className="text-white font-medium">📊 Manage Player Scores</h3>
          {!showScoreManager && (
            <button
              onClick={() => setShowScoreManager(true)}
              className="bg-yellow-500 text-white px-4 py-1 rounded-lg hover:bg-yellow-600 text-sm font-medium"
            >
              View/Edit Scores
            </button>
          )}
        </div>

        {showScoreManager && (
          <div className="p-4">
            <div className="flex items-center gap-4 mb-4">
              <label className="text-sm font-medium text-gray-700">View Week:</label>
              <select
                value={scoreManagerWeek}
                onChange={(e) => setScoreManagerWeek(parseInt(e.target.value))}
                className="border rounded-lg px-3 py-2"
              >
                {weeks.map(w => (
                  <option key={w.id} value={w.id}>
                    Week {w.id} - {formatShortDate(w.date)}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowScoreManager(false)}
                className="ml-auto text-gray-500 hover:text-gray-700"
              >
                ✕ Close
              </button>
            </div>

            {/* Add Score Form */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <span className="text-sm font-medium text-gray-700">Add Score:</span>
                <select
                  value={adminAddScore.playerId}
                  onChange={(e) => setAdminAddScore({ ...adminAddScore, playerId: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select player...</option>
                  {players
                    .filter(p => !playerScores.some(s => s.player_id === p.id && s.week_id === scoreManagerWeek))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name} (HCP: {calc9HoleHandicap(p.handicap)})</option>
                    ))}
                </select>
                <input
                  type="number"
                  placeholder="Gross Score"
                  value={adminAddScore.grossScore}
                  onChange={(e) => setAdminAddScore({ ...adminAddScore, grossScore: e.target.value })}
                  className="border rounded-lg px-3 py-2 w-28 text-sm"
                />
              </div>

              {/* Team Info for Admin */}
              {adminAddScore.playerId && getTeamTypeForWeek(scoreManagerWeek) && (() => {
                const { teammates, teamType, isThreesome } = getTeammatesForWeek(
                  parseInt(adminAddScore.playerId), scoreManagerWeek
                );
                const allMembers = [parseInt(adminAddScore.playerId), ...teammates];
                return (
                  <div className="bg-blue-50 rounded-lg p-2 text-sm mb-3">
                    <strong className="text-blue-800">{teamType === '2-person' ? '2-Person' : '4-Person'} Team Score</strong>
                    <span className="text-blue-700"> — saving for: {allMembers.map(id => getPlayerById(id)?.name).join(', ')}</span>
                    {isThreesome && <span className="text-yellow-600 ml-2">(threesome)</span>}
                  </div>
                );
              })()}

              {/* Birdie/Eagle Holes Selection for Add Score */}
              {adminAddScore.playerId && adminAddScore.grossScore && (() => {
                const week = weeks.find(w => w.id === scoreManagerWeek);
                const holesThisWeek = week?.nineHoles === 'front'
                  ? courseHoles.slice(0, 9)
                  : courseHoles.slice(9, 18);

                return (
                  <div className="mb-3">
                    <div className="text-xs text-gray-600 mb-2">Select birdie/eagle holes (optional):</div>
                    <div className="flex flex-wrap gap-1">
                      {holesThisWeek.map(hole => {
                        const isBirdie = adminAddScore.birdieHoles.includes(hole.number);
                        const isEagle = adminAddScore.eagleHoles.includes(hole.number);
                        return (
                          <button
                            key={hole.number}
                            onClick={() => {
                              if (isEagle) {
                                setAdminAddScore(prev => ({
                                  ...prev,
                                  eagleHoles: prev.eagleHoles.filter(h => h !== hole.number)
                                }));
                              } else if (isBirdie) {
                                setAdminAddScore(prev => ({
                                  ...prev,
                                  birdieHoles: prev.birdieHoles.filter(h => h !== hole.number),
                                  eagleHoles: [...prev.eagleHoles, hole.number]
                                }));
                              } else {
                                setAdminAddScore(prev => ({
                                  ...prev,
                                  birdieHoles: [...prev.birdieHoles, hole.number]
                                }));
                              }
                            }}
                            className={`w-10 h-8 rounded text-xs font-bold transition-colors ${
                              isEagle
                                ? 'bg-yellow-500 text-white'
                                : isBirdie
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            title={`Hole ${hole.number} (Par ${hole.par}) - Click: ${isEagle ? 'Remove' : isBirdie ? 'Eagle' : 'Birdie'}`}
                          >
                            {hole.number}
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Click once = Birdie (green), twice = Eagle (gold), third = remove
                    </div>
                  </div>
                );
              })()}

              <button
                onClick={async () => {
                  if (!adminAddScore.playerId || !adminAddScore.grossScore) {
                    alert('Please select a player and enter a score');
                    return;
                  }
                  const playerId = parseInt(adminAddScore.playerId);
                  const grossScore = parseInt(adminAddScore.grossScore);
                  const teamType = getTeamTypeForWeek(scoreManagerWeek);
                  const isTeamScore = teamType !== null;

                  if (isTeamScore) {
                    const { teammates, isSolo } = getTeammatesForWeek(playerId, scoreManagerWeek);
                    const allMembers = isSolo ? [playerId] : [playerId, ...teammates];

                    for (const memberId of allMembers) {
                      const member = players.find(p => p.id === memberId);
                      if (!member) continue;
                      const handicap9 = calc9HoleHandicap(member.handicap);
                      const netScore = grossScore - handicap9;

                      await savePlayerScoreToSupabase(memberId, scoreManagerWeek, grossScore, netScore, handicap9, adminAddScore.birdieHoles, adminAddScore.eagleHoles, true);

                      setPlayerScores(prev => {
                        const existingIdx = prev.findIndex(s => s.player_id === memberId && s.week_id === scoreManagerWeek);
                        if (existingIdx >= 0) {
                          const updated = [...prev];
                          updated[existingIdx] = { player_id: memberId, week_id: scoreManagerWeek, gross_score: grossScore, net_score: netScore, handicap_used: handicap9, birdie_holes: adminAddScore.birdieHoles, eagle_holes: adminAddScore.eagleHoles, is_team_score: true };
                          return updated;
                        }
                        return [...prev, { player_id: memberId, week_id: scoreManagerWeek, gross_score: grossScore, net_score: netScore, handicap_used: handicap9, birdie_holes: adminAddScore.birdieHoles, eagle_holes: adminAddScore.eagleHoles, is_team_score: true }];
                      });
                    }
                  } else {
                    const player = players.find(p => p.id === playerId);
                    const handicap9 = calc9HoleHandicap(player.handicap);
                    const netScore = grossScore - handicap9;

                    await savePlayerScoreToSupabase(playerId, scoreManagerWeek, grossScore, netScore, handicap9, adminAddScore.birdieHoles, adminAddScore.eagleHoles, false);

                    setPlayerScores(prev => [...prev, {
                      player_id: playerId,
                      week_id: scoreManagerWeek,
                      gross_score: grossScore,
                      net_score: netScore,
                      handicap_used: handicap9,
                      birdie_holes: adminAddScore.birdieHoles,
                      eagle_holes: adminAddScore.eagleHoles,
                      is_team_score: false
                    }]);
                  }

                  await recalculateGiantSkins();

                  setAdminAddScore({ playerId: '', grossScore: '', birdieHoles: [], eagleHoles: [] });
                }}
                disabled={!adminAddScore.playerId || !adminAddScore.grossScore}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  adminAddScore.playerId && adminAddScore.grossScore
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Add Score
              </button>
            </div>

            {(() => {
              const weekScores = playerScores.filter(s => s.week_id === scoreManagerWeek);
              if (weekScores.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    No scores recorded for Week {scoreManagerWeek}
                  </div>
                );
              }

              const week = weeks.find(w => w.id === scoreManagerWeek);
              const holesThisWeek = week?.nineHoles === 'front'
                ? courseHoles.slice(0, 9)
                : courseHoles.slice(9, 18);

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left p-2">Player</th>
                        <th className="text-center p-2">Gross</th>
                        <th className="text-center p-2">HCP</th>
                        <th className="text-center p-2">Net</th>
                        <th className="text-center p-2">Birdies/Eagles</th>
                        <th className="text-center p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekScores
                        .sort((a, b) => a.net_score - b.net_score)
                        .map(score => {
                          const player = players.find(p => p.id === score.player_id);
                          const isEditing = editingScore?.player_id === score.player_id && editingScore?.week_id === score.week_id;
                          const birdies = score.birdie_holes || [];
                          const eagles = score.eagle_holes || [];

                          return (
                            <tr key={`${score.player_id}-${score.week_id}`} className={`border-b ${isEditing ? 'bg-blue-50' : ''}`}>
                              <td className="p-2 font-medium">{player?.name || 'Unknown'}</td>
                              <td className="p-2 text-center">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={editingScore.gross_score}
                                    onChange={(e) => setEditingScore({ ...editingScore, gross_score: parseInt(e.target.value) || 0 })}
                                    className="w-16 border rounded px-2 py-1 text-center"
                                  />
                                ) : (
                                  score.gross_score
                                )}
                              </td>
                              <td className="p-2 text-center text-gray-500">-{score.handicap_used}</td>
                              <td className="p-2 text-center font-bold text-purple-700">
                                {isEditing ? (editingScore.gross_score - calc9HoleHandicap(player?.handicap || 0)) : score.net_score}
                              </td>
                              <td className="p-2">
                                {isEditing ? (
                                  <div className="flex flex-wrap gap-1 justify-center">
                                    {holesThisWeek.map(hole => {
                                      const editBirdies = editingScore.birdie_holes || [];
                                      const editEagles = editingScore.eagle_holes || [];
                                      const isBirdie = editBirdies.includes(hole.number);
                                      const isEagle = editEagles.includes(hole.number);
                                      return (
                                        <button
                                          key={hole.number}
                                          onClick={() => {
                                            if (isEagle) {
                                              setEditingScore(prev => ({
                                                ...prev,
                                                eagle_holes: (prev.eagle_holes || []).filter(h => h !== hole.number)
                                              }));
                                            } else if (isBirdie) {
                                              setEditingScore(prev => ({
                                                ...prev,
                                                birdie_holes: (prev.birdie_holes || []).filter(h => h !== hole.number),
                                                eagle_holes: [...(prev.eagle_holes || []), hole.number]
                                              }));
                                            } else {
                                              setEditingScore(prev => ({
                                                ...prev,
                                                birdie_holes: [...(prev.birdie_holes || []), hole.number]
                                              }));
                                            }
                                          }}
                                          className={`w-7 h-6 rounded text-xs font-bold ${
                                            isEagle
                                              ? 'bg-yellow-500 text-white'
                                              : isBirdie
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                          }`}
                                          title={`Hole ${hole.number} (Par ${hole.par})`}
                                        >
                                          {hole.number}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="flex gap-1 justify-center flex-wrap">
                                    {birdies.length === 0 && eagles.length === 0 && (
                                      <span className="text-gray-400 text-xs">-</span>
                                    )}
                                    {birdies.map(h => (
                                      <span key={`b${h}`} className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-xs font-medium">
                                        #{h}🐦
                                      </span>
                                    ))}
                                    {eagles.map(h => (
                                      <span key={`e${h}`} className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded text-xs font-medium">
                                        #{h}🦅
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="p-2 text-center">
                                {isEditing ? (
                                  <div className="flex gap-1 justify-center">
                                    <button
                                      onClick={() => updatePlayerScore(
                                        score.player_id,
                                        score.week_id,
                                        editingScore.gross_score,
                                        editingScore.birdie_holes || [],
                                        editingScore.eagle_holes || []
                                      )}
                                      className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingScore(null)}
                                      className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-400"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1 justify-center">
                                    <button
                                      onClick={() => setEditingScore({
                                        ...score,
                                        birdie_holes: score.birdie_holes || [],
                                        eagle_holes: score.eagle_holes || []
                                      })}
                                      className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm(`Delete score for ${player?.name}?`)) {
                                          deletePlayerScore(score.player_id, score.week_id);
                                        }
                                      }}
                                      className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs hover:bg-red-200"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Weekly Games Editor */}
      <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-green-800 px-4 py-3 flex items-center justify-between">
          <h3 className="text-white font-medium">🎮 Weekly Games</h3>
          {!showWeeklyGameEditor && (
            <button
              onClick={loadWeeklyGameForEdit}
              className="bg-yellow-500 text-white px-4 py-1 rounded-lg hover:bg-yellow-600 text-sm font-medium"
            >
              Edit Game Info
            </button>
          )}
        </div>

        {!showWeeklyGameEditor && currentGame && (
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500 mb-1">This Week's Game</div>
                <div className="font-bold text-green-800">{currentGame.gameName}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-500 mb-1">Side Game</div>
                <div className="font-bold text-yellow-700">{currentGame.sideGame}</div>
              </div>
            </div>
          </div>
        )}

        {showWeeklyGameEditor && (
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              Edit the game name, description, and side game for Week {selectedWeek}.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Game Name</label>
                <input
                  type="text"
                  value={weeklyGameEdit.gameName}
                  onChange={(e) => setWeeklyGameEdit({ ...weeklyGameEdit, gameName: e.target.value })}
                  placeholder="e.g., 2-Man Scramble"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Game Description (include payouts)</label>
                <textarea
                  value={weeklyGameEdit.gameDescription}
                  onChange={(e) => setWeeklyGameEdit({ ...weeklyGameEdit, gameDescription: e.target.value })}
                  placeholder="Describe the game format and include payout structure..."
                  rows={6}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Side Game Name</label>
                  <input
                    type="text"
                    value={weeklyGameEdit.sideGame}
                    onChange={(e) => setWeeklyGameEdit({ ...weeklyGameEdit, sideGame: e.target.value })}
                    placeholder="e.g., Greenies"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Side Game Description</label>
                  <input
                    type="text"
                    value={weeklyGameEdit.sideGameDescription}
                    onChange={(e) => setWeeklyGameEdit({ ...weeklyGameEdit, sideGameDescription: e.target.value })}
                    placeholder="e.g., $10 per greenie"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Type</label>
                <select
                  value={weeklyGameEdit.teamType || ''}
                  onChange={(e) => setWeeklyGameEdit({ ...weeklyGameEdit, teamType: e.target.value || null, showTeamHandicap: e.target.value ? weeklyGameEdit.showTeamHandicap : false })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Individual (no teams)</option>
                  <option value="2-person">2-Person Teams</option>
                  <option value="4-person">4-Person Teams</option>
                </select>
              </div>
              {weeklyGameEdit.teamType && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={weeklyGameEdit.showTeamHandicap}
                      onChange={(e) => setWeeklyGameEdit({ ...weeklyGameEdit, showTeamHandicap: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-green-700 focus:ring-green-600"
                    />
                    <div>
                      <span className="font-medium text-gray-800">Show Team Handicap</span>
                      <p className="text-xs text-gray-500 mt-0.5">Display calculated team handicap on the tee sheet</p>
                    </div>
                  </label>
                  {weeklyGameEdit.showTeamHandicap && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">USGA Handicap Format</label>
                      <select
                        value={weeklyGameEdit.handicapFormat || 'scramble'}
                        onChange={(e) => setWeeklyGameEdit({ ...weeklyGameEdit, handicapFormat: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="scramble">Scramble (35%/15% or 20%/15%/10%/5%)</option>
                        <option value="fourBall">Four-Ball / Best Ball (85% of lowest)</option>
                        <option value="shamble">Shamble (75% each, summed)</option>
                        <option value="aggregate">Aggregate (100% sum)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {weeklyGameEdit.handicapFormat === 'scramble' && 'USGA Scramble: 2-person = 35% low + 15% high. 4-person = 20% + 15% + 10% + 5% (low to high).'}
                        {weeklyGameEdit.handicapFormat === 'fourBall' && 'USGA Four-Ball: Each player at 85% of course handicap. Team handicap = lowest adjusted.'}
                        {weeklyGameEdit.handicapFormat === 'shamble' && 'Shamble: Each player at 75% of course handicap. Team handicap = sum of adjusted handicaps.'}
                        {weeklyGameEdit.handicapFormat === 'aggregate' && 'Full course handicaps summed together (100% of each player).'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveWeeklyGame}
                className="flex-1 bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 font-medium"
              >
                Save Game Info
              </button>
              <button
                onClick={() => setShowWeeklyGameEditor(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Player Management */}
      <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-green-800 px-4 py-3 flex items-center justify-between">
          <h3 className="text-white font-medium">👤 Player Management</h3>
          {!showPlayerEditor && !showAddPlayer && (
            <button
              onClick={() => setShowAddPlayer(true)}
              className="bg-yellow-500 text-white px-4 py-1 rounded-lg hover:bg-yellow-600 text-sm font-medium"
            >
              + Add Player
            </button>
          )}
        </div>

        <div className="p-4">
          {showAddPlayer ? (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-800">Add New Player</h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={newPlayer.name}
                    onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                    placeholder="Full name"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">18-Hole Handicap</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newPlayer.handicap}
                    onChange={(e) => setNewPlayer({ ...newPlayer, handicap: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">9-Hole Handicap</label>
                  <div className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-700 font-bold">
                    {calc9HoleHandicap(newPlayer.handicap)}
                    <span className="text-xs font-normal text-gray-500 ml-2">(auto-calculated)</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={newPlayer.phone}
                    onChange={(e) => setNewPlayer({ ...newPlayer, phone: e.target.value })}
                    placeholder="e.g., 847-555-1234"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newPlayer.email}
                    onChange={(e) => setNewPlayer({ ...newPlayer, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CDGA ID</label>
                  <input
                    type="text"
                    value={newPlayer.cdgaId}
                    onChange={(e) => setNewPlayer({ ...newPlayer, cdgaId: e.target.value })}
                    placeholder="e.g., 12345678 or N/A"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Player Type</label>
                  <select
                    value={newPlayer.type}
                    onChange={(e) => setNewPlayer({ ...newPlayer, type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="full-time">Full-Time Member</option>
                    <option value="substitute">Substitute</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Tee Times</label>
                <div className="flex flex-wrap gap-2">
                  {teeTimes.map(time => (
                    <button
                      key={time}
                      onClick={() => toggleNewPlayerAvailability(time)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        newPlayer.availability.includes(time)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {newPlayer.availability.length} tee time{newPlayer.availability.length !== 1 ? 's' : ''} selected
                </p>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleAddPlayer}
                  disabled={!newPlayer.name.trim()}
                  className={`flex-1 py-2 rounded-lg font-medium ${
                    newPlayer.name.trim()
                      ? 'bg-green-700 text-white hover:bg-green-800'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Add Player
                </button>
                <button
                  onClick={() => {
                    setShowAddPlayer(false);
                    setNewPlayer({ name: '', phone: '', email: '', handicap: 0, cdgaId: '', availability: [], type: 'full-time' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : !showPlayerEditor ? (
            <>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search players by name..."
                  value={playerSearchTerm}
                  onChange={(e) => setPlayerSearchTerm(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredPlayersForAdmin.map(player => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        player.type === 'substitute' ? 'bg-yellow-100' : 'bg-green-100'
                      }`}>
                        👤
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{player.name}</div>
                        <div className="text-xs text-gray-500">
                          9-HCP: {calc9HoleHandicap(player.handicap)} (18: {player.handicap}) • {player.availability.length} tee times • {player.type}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadPlayerForEdit(player.id)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setShowRemoveConfirm(player.id)}
                        className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-sm text-gray-500 text-center">
                {filteredPlayersForAdmin.length} player{filteredPlayersForAdmin.length !== 1 ? 's' : ''} found
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800">
                  Editing: {players.find(p => p.id === editingPlayerId)?.name}
                </h4>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  playerEdit.type === 'full-time' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {playerEdit.type}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={playerEdit.name}
                    onChange={(e) => setPlayerEdit({ ...playerEdit, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">18-Hole Handicap</label>
                  <input
                    type="number"
                    step="0.1"
                    value={playerEdit.handicap}
                    onChange={(e) => setPlayerEdit({ ...playerEdit, handicap: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">9-Hole Handicap</label>
                  <div className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-700 font-bold">
                    {calc9HoleHandicap(playerEdit.handicap)}
                    <span className="text-xs font-normal text-gray-500 ml-2">(auto-calculated)</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={playerEdit.phone}
                    onChange={(e) => setPlayerEdit({ ...playerEdit, phone: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={playerEdit.email}
                    onChange={(e) => setPlayerEdit({ ...playerEdit, email: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CDGA ID</label>
                  <input
                    type="text"
                    value={playerEdit.cdgaId}
                    onChange={(e) => setPlayerEdit({ ...playerEdit, cdgaId: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Player Type</label>
                  <select
                    value={playerEdit.type}
                    onChange={(e) => setPlayerEdit({ ...playerEdit, type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="full-time">Full-Time Member</option>
                    <option value="substitute">Substitute</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Tee Times</label>
                <div className="flex flex-wrap gap-2">
                  {teeTimes.map(time => (
                    <button
                      key={time}
                      onClick={() => toggleAvailability(time)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        playerEdit.availability.includes(time)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {playerEdit.availability.length} tee time{playerEdit.availability.length !== 1 ? 's' : ''} selected
                </p>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSavePlayer}
                  className="flex-1 bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 font-medium"
                >
                  Save Player
                </button>
                <button
                  onClick={() => { setShowPlayerEditor(false); setEditingPlayerId(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Giant Skins Manager */}
      <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-green-800 px-4 py-3 flex items-center justify-between">
          <h3 className="text-white font-medium">🏆 Giant Skins Manager</h3>
          <button
            onClick={() => setShowGiantSkinsManager(!showGiantSkinsManager)}
            className="bg-yellow-500 text-white px-4 py-1 rounded-lg hover:bg-yellow-600 text-sm font-medium"
          >
            {showGiantSkinsManager ? 'Close' : 'Manage Skins'}
          </button>
        </div>

        {showGiantSkinsManager && (
          <div className="p-4 space-y-4">
            {/* Add Player to Hole */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-3">Add Player to Hole</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Hole</label>
                  <select
                    value={giantSkinsAddForm.holeNumber}
                    onChange={(e) => setGiantSkinsAddForm(prev => ({ ...prev, holeNumber: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select hole...</option>
                    {courseHoles.map(h => (
                      <option key={h.number} value={h.number}>Hole {h.number} (Par {h.par})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Player</label>
                  <select
                    value={giantSkinsAddForm.playerId}
                    onChange={(e) => setGiantSkinsAddForm(prev => ({ ...prev, playerId: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select player...</option>
                    {players.sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Type</label>
                  <div className="flex gap-2 items-center h-[38px]">
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="radio"
                        name="skinType"
                        value="birdie"
                        checked={giantSkinsAddForm.type === 'birdie'}
                        onChange={() => setGiantSkinsAddForm(prev => ({ ...prev, type: 'birdie' }))}
                      />
                      Birdie
                    </label>
                    {(() => {
                      const selectedHole = courseHoles.find(h => h.number === parseInt(giantSkinsAddForm.holeNumber));
                      if (selectedHole && selectedHole.par >= 4) {
                        return (
                          <label className="flex items-center gap-1 text-sm">
                            <input
                              type="radio"
                              name="skinType"
                              value="eagle"
                              checked={giantSkinsAddForm.type === 'eagle'}
                              onChange={() => setGiantSkinsAddForm(prev => ({ ...prev, type: 'eagle' }))}
                            />
                            Eagle
                          </label>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!giantSkinsAddForm.holeNumber || !giantSkinsAddForm.playerId) {
                    alert('Please select a hole and a player');
                    return;
                  }
                  addPlayerToGiantSkin(
                    parseInt(giantSkinsAddForm.holeNumber),
                    parseInt(giantSkinsAddForm.playerId),
                    giantSkinsAddForm.type
                  );
                  setGiantSkinsAddForm({ holeNumber: '', playerId: '', type: 'birdie' });
                }}
                disabled={!giantSkinsAddForm.holeNumber || !giantSkinsAddForm.playerId}
                className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium ${
                  giantSkinsAddForm.holeNumber && giantSkinsAddForm.playerId
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Add to Hole
              </button>
            </div>

            {/* Front 9 */}
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Front 9</h4>
              <div className="space-y-1">
                {giantSkins.slice(0, 9).map(hole => {
                  const hasPlayers = hole.players && hole.players.length > 0;
                  return (
                    <div key={hole.number} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold">{hole.number}</span>
                        <span className="text-sm text-gray-500">Par {hole.par}</span>
                        {hasPlayers && (
                          <span className="text-sm font-bold text-yellow-600">Low: {hole.lowScore}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {hasPlayers ? (
                          hole.players.map((p, idx) => {
                            const player = getPlayerById(p.playerId);
                            const scoreType = hole.lowScore === hole.par - 2 ? 'Eagle' : 'Birdie';
                            return (
                              <div key={`${p.playerId}-${idx}`} className="flex items-center gap-1 bg-white rounded px-2 py-1 border text-sm">
                                <span>{player?.name || 'Unknown'}</span>
                                <span className={`text-xs px-1 rounded ${scoreType === 'Eagle' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                  {scoreType}
                                </span>
                                {hole.par >= 4 && (
                                  <button
                                    onClick={() => editGiantSkinType(hole.number, p.playerId, scoreType === 'Birdie' ? 'eagle' : 'birdie')}
                                    className="text-blue-500 hover:text-blue-700 text-xs ml-1"
                                    title={`Switch to ${scoreType === 'Birdie' ? 'Eagle' : 'Birdie'}`}
                                  >
                                    Edit
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    if (confirm(`Remove ${player?.name || 'this player'} from Hole ${hole.number}?`)) {
                                      removePlayerFromGiantSkin(hole.number, p.playerId);
                                    }
                                  }}
                                  className="text-red-500 hover:text-red-700 text-xs ml-1"
                                  title="Remove from hole"
                                >
                                  X
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-sm text-gray-400">No score yet</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Back 9 */}
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Back 9</h4>
              <div className="space-y-1">
                {giantSkins.slice(9, 18).map(hole => {
                  const hasPlayers = hole.players && hole.players.length > 0;
                  return (
                    <div key={hole.number} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold">{hole.number}</span>
                        <span className="text-sm text-gray-500">Par {hole.par}</span>
                        {hasPlayers && (
                          <span className="text-sm font-bold text-yellow-600">Low: {hole.lowScore}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {hasPlayers ? (
                          hole.players.map((p, idx) => {
                            const player = getPlayerById(p.playerId);
                            const scoreType = hole.lowScore === hole.par - 2 ? 'Eagle' : 'Birdie';
                            return (
                              <div key={`${p.playerId}-${idx}`} className="flex items-center gap-1 bg-white rounded px-2 py-1 border text-sm">
                                <span>{player?.name || 'Unknown'}</span>
                                <span className={`text-xs px-1 rounded ${scoreType === 'Eagle' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                  {scoreType}
                                </span>
                                {hole.par >= 4 && (
                                  <button
                                    onClick={() => editGiantSkinType(hole.number, p.playerId, scoreType === 'Birdie' ? 'eagle' : 'birdie')}
                                    className="text-blue-500 hover:text-blue-700 text-xs ml-1"
                                    title={`Switch to ${scoreType === 'Birdie' ? 'Eagle' : 'Birdie'}`}
                                  >
                                    Edit
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    if (confirm(`Remove ${player?.name || 'this player'} from Hole ${hole.number}?`)) {
                                      removePlayerFromGiantSkin(hole.number, p.playerId);
                                    }
                                  }}
                                  className="text-red-500 hover:text-red-700 text-xs ml-1"
                                  title="Remove from hole"
                                >
                                  X
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-sm text-gray-400">No score yet</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reset Data */}
      <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-red-800 px-4 py-3">
          <h3 className="text-white font-medium">🗑️ Reset Data</h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Reset Single Week */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-2">Reset Single Week</h4>
            <p className="text-sm text-gray-600 mb-3">
              Clear all data (schedule, scores, money, giant skins) for a specific week only.
            </p>
            <div className="flex gap-2">
              <select
                value={resetWeekId || ''}
                onChange={(e) => setResetWeekId(e.target.value ? parseInt(e.target.value) : null)}
                className="flex-1 border rounded-lg px-3 py-2"
              >
                <option value="">Select a week...</option>
                {weeks.filter(w => w.teeSheet.length > 0 || w.scoresEntered || w.moneyEntered).map(w => (
                  <option key={w.id} value={w.id}>
                    Week {w.id} - {formatShortDate(w.date)}
                    {w.teeSheet.length > 0 ? ' (has schedule)' : ''}
                    {w.moneyEntered ? ' (has money)' : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={() => resetWeekId && setShowResetConfirm('week')}
                disabled={!resetWeekId}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  resetWeekId
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Reset Week
              </button>
            </div>
          </div>

          {/* Reset All Options */}
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Reset All Season Data</h4>
            <p className="text-sm text-gray-600 mb-3">
              Clear data across the entire season. This cannot be undone.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <button
                onClick={() => setShowResetConfirm('money')}
                className="bg-orange-100 text-orange-700 px-4 py-3 rounded-lg hover:bg-orange-200 font-medium text-sm"
              >
                💰 All Money
              </button>
              <button
                onClick={() => setShowResetConfirm('scores')}
                className="bg-cyan-100 text-cyan-700 px-4 py-3 rounded-lg hover:bg-cyan-200 font-medium text-sm"
              >
                📊 All Scores
              </button>
              <button
                onClick={() => setShowResetConfirm('teeSheets')}
                className="bg-blue-100 text-blue-700 px-4 py-3 rounded-lg hover:bg-blue-200 font-medium text-sm"
              >
                📅 All Schedules
              </button>
              <button
                onClick={() => setShowResetConfirm('giantSkins')}
                className="bg-purple-100 text-purple-700 px-4 py-3 rounded-lg hover:bg-purple-200 font-medium text-sm"
              >
                🏆 All Giant Skins
              </button>
              <button
                onClick={() => setShowResetConfirm('all')}
                className="bg-red-100 text-red-700 px-4 py-3 rounded-lg hover:bg-red-200 font-medium text-sm"
              >
                ⚠️ Everything
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Remove Player Confirmation Modal */}
      {showRemoveConfirm && (() => {
        const playerToRemove = players.find(p => p.id === showRemoveConfirm);
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
              <div className="bg-red-700 px-6 py-4">
                <h3 className="text-xl font-bold text-white">Remove Player</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 mb-2">
                  Are you sure you want to remove <strong>{playerToRemove?.name}</strong> from the league?
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  This will remove them from the player roster. Any existing scores, money, and schedule data will remain in the system.
                </p>
                <p className="text-red-600 font-medium text-sm mb-6">This action cannot be undone!</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleRemovePlayer(showRemoveConfirm)}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-medium"
                  >
                    Yes, Remove Player
                  </button>
                  <button
                    onClick={() => setShowRemoveConfirm(null)}
                    className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-red-700 px-6 py-4">
              <h3 className="text-xl font-bold text-white">⚠️ Confirm Reset</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                {showResetConfirm === 'week' && `This will delete all data for Week ${resetWeekId} (schedule, scores, money, and any giant skins set that week).`}
                {showResetConfirm === 'money' && 'This will delete all money entries and reset player totals to $0.'}
                {showResetConfirm === 'scores' && 'This will delete all player scores and reset the Score Leaderboard.'}
                {showResetConfirm === 'teeSheets' && 'This will delete all tee sheets, scores, and schedule data.'}
                {showResetConfirm === 'giantSkins' && 'This will reset all Giant Skins standings.'}
                {showResetConfirm === 'all' && 'This will delete ALL data: money, schedules, scores, and giant skins.'}
              </p>
              <p className="text-red-600 font-medium text-sm mb-6">This action cannot be undone!</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (showResetConfirm === 'week') resetSingleWeek(resetWeekId);
                    else if (showResetConfirm === 'money') resetMoneyData();
                    else if (showResetConfirm === 'scores') resetPlayerScores();
                    else if (showResetConfirm === 'teeSheets') resetTeeSheets();
                    else if (showResetConfirm === 'giantSkins') resetGiantSkins();
                    else if (showResetConfirm === 'all') resetAllData();
                  }}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-medium"
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => { setShowResetConfirm(null); setResetWeekId(null); }}
                  className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
