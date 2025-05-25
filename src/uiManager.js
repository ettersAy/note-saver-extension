import {
  noteTitleInput,
  noteContentInput,
  deleteNoteAction,
  tabsListUL,
  statusMessageSpan,
  noteEditorArea,
  userInfoPanel,
  userInfoEmail,
  authSection,
  mainAppContent,
  signupForm,
  loginForm,
  userStatusInTabBar,
  newNoteTabButton, // Added, used in updateAppUIForAuthState
  userSettingsTabButton // Added, used in updateAppUIForAuthState
} from './domElements.js';

// --- UI Utility Functions ---
export function showStatus(message, duration = 2000, isError = false) {
  if (!statusMessageSpan) return; // Guard against missing element
  statusMessageSpan.textContent = message;
  statusMessageSpan.style.color = isError ? 'red' : 'green';
  statusMessageSpan.style.display = 'block';
  if (duration > 0) {
    setTimeout(() => {
      statusMessageSpan.textContent = '';
      statusMessageSpan.style.display = 'none';
    }, duration);
  }
}

export function formatTimestamp(timestamp) {
  if (!timestamp || !timestamp.toDate) {
    return 'Not saved yet';
  }
  return timestamp.toDate().toLocaleString();
}

// --- Core UI Rendering Functions ---

export function renderTabs(openTabs, activeTabId, notesCache, handleTabSwitchCallback) {
  if (!tabsListUL) return;
  const currentActiveIdForRender = activeTabId;
  const noteTabElements = tabsListUL.querySelectorAll('li:not(.tab-action-button)');
  noteTabElements.forEach(el => el.remove());

  openTabs.forEach(tab => {
    const li = document.createElement('li');
    li.textContent = tab.title || 'Untitled';
    li.dataset.noteId = tab.id;
    if (tab.id === currentActiveIdForRender) {
      li.classList.add('active');
    }

    if (tab.id.startsWith('temp_id_')) {
      li.title = 'Not saved yet';
    } else {
      const note = notesCache[tab.id];
      li.title = `Last modified: ${formatTimestamp(note?.timestamp)}`;
    }

    li.addEventListener('click', () => handleTabSwitchCallback(tab.id));
    const firstActionButton = tabsListUL.querySelector('.tab-action-button');
    if (firstActionButton) {
      tabsListUL.insertBefore(li, firstActionButton);
    } else {
      tabsListUL.appendChild(li);
    }
  });
}

export function loadNoteIntoEditor(noteId, openTabs, notesCache) {
  if (!noteTitleInput || !noteContentInput || !deleteNoteAction) return;

  if (!noteId) {
    clearEditorFields();
    deleteNoteAction.style.pointerEvents = 'none';
    deleteNoteAction.style.opacity = '0.5';
    return;
  }

  const tabData = openTabs.find(t => t.id === noteId);
  if (!tabData) {
      clearEditorFields();
      // Optionally show a status or log if a tab isn't found for a valid noteId
      return;
  }

  if (noteId.startsWith('temp_id_')) {
    noteTitleInput.value = tabData.title === 'Untitled' ? '' : tabData.title;
    noteContentInput.value = ''; // New temp notes are empty
    deleteNoteAction.style.pointerEvents = 'none';
    deleteNoteAction.style.opacity = '0.5';
  } else {
    const note = notesCache[noteId];
    if (note) {
      noteTitleInput.value = note.title || '';
      noteContentInput.value = note.content || '';
      deleteNoteAction.style.pointerEvents = 'auto';
      deleteNoteAction.style.opacity = '1';
    } else {
      console.warn(`Note ${noteId} not found in cache for editor.`);
      clearEditorFields(); // Clear fields if note data is missing
    }
  }
}

export function clearEditorFields() {
  if (!noteTitleInput || !noteContentInput) return;
  noteTitleInput.value = '';
  noteContentInput.value = '';
}

// --- Auth UI Management ---
export function toggleAuthFormsDisplay(showLogin) {
  if (!loginForm || !signupForm) return;
  if (showLogin) {
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
  } else {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
  }
}

export function updateAppUIForAuthState(user, profile, notesCache, openTabs, activeTabId) {
  // Guard against missing DOM elements
  if (!authSection || !mainAppContent || !userStatusInTabBar || !noteTitleInput || !noteContentInput || !newNoteTabButton || !userSettingsTabButton || !tabsListUL || !deleteNoteAction || !noteEditorArea || !userInfoPanel) {
    console.error("One or more critical DOM elements missing for UI update.");
    return;
  }

  if (user && profile && profile.isActive) {
    authSection.style.display = 'none';
    mainAppContent.style.display = 'flex';
    userStatusInTabBar.style.display = 'flex';

    noteTitleInput.disabled = false;
    noteContentInput.disabled = false;
    newNoteTabButton.disabled = false;
    userSettingsTabButton.style.display = 'list-item';
    noteEditorArea.style.display = 'block';
    userInfoPanel.style.display = 'none';
    // Ensure delete action is enabled/disabled based on current note in loadNoteIntoEditor
  } else if (user && profile && !profile.isActive) {
    authSection.style.display = 'none';
    mainAppContent.style.display = 'flex';
    userStatusInTabBar.style.display = 'flex';
    
    const noteTabElements = tabsListUL.querySelectorAll('li:not(.tab-action-button)');
    noteTabElements.forEach(el => el.remove());
    const liMessage = document.createElement('li');
    liMessage.style.padding = '10px';
    liMessage.style.color = '#777';
    liMessage.textContent = 'Your account is inactive. Please contact admin.';
    const firstActionButton = tabsListUL.querySelector('.tab-action-button');
    if (firstActionButton) {
        tabsListUL.insertBefore(liMessage, firstActionButton);
    } else {
        tabsListUL.appendChild(liMessage);
    }
    // State clearing (notesCache, openTabs, activeTabId) should happen in popup.js before calling this

    noteTitleInput.disabled = true;
    noteContentInput.disabled = true;
    deleteNoteAction.style.pointerEvents = 'none'; deleteNoteAction.style.opacity = '0.5';
    newNoteTabButton.disabled = true;
    userSettingsTabButton.style.display = 'list-item'; // Still show for logout
    noteEditorArea.style.display = 'block'; 
    userInfoPanel.style.display = 'none';
    showStatus('Account inactive.', 0, true);
  } else { // Logged out
    authSection.style.display = 'block';
    mainAppContent.style.display = 'none';
    userStatusInTabBar.style.display = 'none';
    toggleAuthFormsDisplay(true);

    const noteTabElements = tabsListUL.querySelectorAll('li:not(.tab-action-button)');
    noteTabElements.forEach(el => el.remove());
    // State clearing (notesCache, openTabs, activeTabId) should happen in popup.js

    noteTitleInput.disabled = true;
    noteContentInput.disabled = true;
    deleteNoteAction.style.pointerEvents = 'none'; deleteNoteAction.style.opacity = '0.5';
    newNoteTabButton.disabled = true;
    userSettingsTabButton.style.display = 'none';
    noteEditorArea.style.display = 'block';
    userInfoPanel.style.display = 'none';
  }
}

// This function might be called from popup.js after state is updated there
export function displayNotesUnavailableMessage() {
    if (!tabsListUL) return;
    const noteTabElements = tabsListUL.querySelectorAll('li:not(.tab-action-button)');
    noteTabElements.forEach(el => el.remove());
    const liMessage = document.createElement('li');
    liMessage.style.padding = '10px';
    liMessage.style.color = '#777';
    liMessage.textContent = 'Notes unavailable.';
    const firstActionButton = tabsListUL.querySelector('.tab-action-button');
    if (firstActionButton) {
        tabsListUL.insertBefore(liMessage, firstActionButton);
    } else {
        tabsListUL.appendChild(liMessage);
    }
}
