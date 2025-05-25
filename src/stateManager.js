// --- Private Module State ---
let notesCache = {};
let openTabs = []; // Array of { id: string, title: string }
let activeTabId = null;
let tempIdCounter = 0;

let currentUid = null;
let currentUserEmail = null;
let currentUserRole = null;
let currentUserIsActive = false;

// --- Notes Cache ---
export function getNotesCache() {
  return notesCache;
}
export function setNotesCache(newCache) {
  notesCache = newCache;
}
export function updateNoteInCache(note) {
  if (note && note.id) {
    notesCache[note.id] = note;
  }
}
export function removeNoteFromCache(noteId) {
  delete notesCache[noteId];
}

// --- Open Tabs ---
export function getOpenTabs() {
  return openTabs;
}
export function setOpenTabs(newTabs) {
  openTabs = newTabs;
}
export function addOpenTab(tab) {
  openTabs.push(tab);
}
export function removeOpenTabById(tabId) {
  openTabs = openTabs.filter(tab => tab.id !== tabId);
}
// Updates a tab in the openTabs array. Typically to change ID from temp to real, or update title.
export function updateOpenTab(tabIdToFind, newTabData) {
  const tabIndex = openTabs.findIndex(tab => tab.id === tabIdToFind);
  if (tabIndex !== -1) {
    openTabs[tabIndex] = { ...openTabs[tabIndex], ...newTabData };
  }
}


// --- Active Tab ---
export function getActiveTabId() {
  return activeTabId;
}
export function setActiveTabId(id) {
  activeTabId = id;
}

// --- Temp ID Counter ---
export function getTempIdCounter() {
  return tempIdCounter;
}
// Increments counter and returns a new temporary ID string
export function generateTempId() {
  tempIdCounter++;
  return `temp_id_${tempIdCounter}`;
}

// --- User State ---
export function getCurrentUid() {
  return currentUid;
}
export function getCurrentUserEmail() {
  return currentUserEmail;
}
export function getCurrentUserRole() {
  return currentUserRole;
}
export function isCurrentUserActive() {
  return currentUserIsActive;
}
export function setCurrentUser({ uid, email, role, isActive }) {
  currentUid = uid;
  currentUserEmail = email;
  currentUserRole = role;
  currentUserIsActive = isActive;
}

// --- State Reset Functions ---
export function resetNotesState() {
  notesCache = {};
  openTabs = [];
  activeTabId = null;
  // tempIdCounter is generally not reset with notes, but on full app re-init or if desired.
  // For now, not resetting tempIdCounter here.
}

export function resetUserState() {
  currentUid = null;
  currentUserEmail = null;
  currentUserRole = null;
  currentUserIsActive = false;
  resetNotesState(); // Also clear all note-related state when user logs out
}

// Initialize with default values (already done by let declarations at the top)
