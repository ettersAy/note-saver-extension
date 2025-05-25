// Firebase serverTimestamp can be imported if needed for other direct uses,
// but firebaseService.js handles it for its operations.
// For now, assuming it's not directly needed in popup.js after refactoring.
// import { serverTimestamp } from 'firebase/firestore'; 

// Import Firebase services
import {
  db, // db might not be directly used if all operations go via service functions
  auth, // auth might not be directly used if all operations go via service functions
  addNote,
  updateNote,
  deleteNoteById,
  loadNotesForUser,
  signUpUser,
  signInUser,
  signOutUser,
  onAuthChange,
  getUserProfile,
  createUserProfile
} from './src/firebaseService.js';

// Import DOM elements
import {
  noteTitleInput,
  noteContentInput,
  newNoteTabButton,
  userSettingsTabButton,
  deleteNoteAction,
  tabsListUL,
  statusMessageSpan,
  noteEditorArea,
  userInfoPanel,
  userInfoEmail,
  logoutButton,
  authSection,
  mainAppContent,
  signupForm,
  signupEmailInput,
  signupPasswordInput,
  loginForm,
  loginEmailInput,
  loginPasswordInput,
  showLoginLink,
  showSignupLink,
  userStatusInTabBar
} from './src/domElements.js';

// Import UI manager functions
import {
  showStatus,
  // formatTimestamp, // No longer directly used in popup.js after uiManager refactor
  renderTabs,
  loadNoteIntoEditor,
  clearEditorFields,
  toggleAuthFormsDisplay,
  updateAppUIForAuthState,
  displayNotesUnavailableMessage
} from './src/uiManager.js';

// Import State Manager functions
import {
  getNotesCache, setNotesCache, updateNoteInCache, removeNoteFromCache,
  getOpenTabs, setOpenTabs, addOpenTab, removeOpenTabById, updateOpenTab,
  getActiveTabId, setActiveTabId,
  // getTempIdCounter, // Not directly used, generateTempId is preferred
  generateTempId,
  getCurrentUid, getCurrentUserEmail, getCurrentUserRole, isCurrentUserActive, setCurrentUser,
  resetUserState, resetNotesState
} from './src/stateManager.js';

document.addEventListener('DOMContentLoaded', function () {
  // Firebase instances are imported from firebaseService.js
  // State variables are now managed by stateManager.js

  // Local non-state variables (like timeouts) can remain
  let autoSaveTimeout = null; // For debouncing auto-save

  // --- Utility Functions ---
  function debounce(func, delay) {
    return function(...args) {
      clearTimeout(autoSaveTimeout);
      autoSaveTimeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // showStatus is now imported from uiManager.js
  // formatTimestamp is now in uiManager.js and used by uiManager.renderTabs

  // --- Core Tab & Note Functions ---

  function renderTabsAndEditor() {
    // Use functions from uiManager, passing necessary state (via getters) and callbacks
    renderTabs(getOpenTabs(), getActiveTabId(), getNotesCache(), handleTabSwitch);
    loadNoteIntoEditor(getActiveTabId(), getOpenTabs(), getNotesCache());
  }

  // renderTabs, loadNoteIntoEditor, clearEditorFields are imported from uiManager.js

  function handleTabSwitch(noteId) {
    if (noteId === getActiveTabId()) return; // Use getter
     // If user info panel is visible, hide it and show editor
    if (userInfoPanel.style.display === 'block') {
        userInfoPanel.style.display = 'none';
        noteEditorArea.style.display = 'block'; // Or 'flex'
    }
    setActiveTabId(noteId); // Use setter
    renderTabsAndEditor();
  }

  function handleNewTab() {
    if (!getCurrentUid() || !isCurrentUserActive()) { // Use getters
      showStatus('Please sign in and have an active account to create notes.', 3000, true);
      return;
    }
    // If user info panel is visible, hide it and show editor
    if (userInfoPanel.style.display === 'block') {
        userInfoPanel.style.display = 'none';
        noteEditorArea.style.display = 'block'; // Or 'flex'
    }

    const newTempId = generateTempId(); // Use stateManager function
    addOpenTab({ id: newTempId, title: 'Untitled' }); // Use stateManager function
    setActiveTabId(newTempId); // Use stateManager function
    renderTabsAndEditor();
    noteTitleInput.focus();
    showStatus('New note tab created.', 1500);
  }

  const autoSaveNote = debounce(async () => {
    if (getActiveTabId() && getCurrentUid() && isCurrentUserActive()) { // Use getters
      await saveCurrentNote();
    } else {
      console.log('Auto-save skipped: No active tab, user not signed in, or user inactive.');
    }
  }, 1500); // Auto-save after 1.5 seconds of inactivity


  async function loadInitialNotes() {
    if (!getCurrentUid() || !isCurrentUserActive()) { // Use getters
        displayNotesUnavailableMessage();
        resetNotesState(); // Clear notesCache, openTabs, activeTabId via stateManager
        clearEditorFields();
        return;
    }

    try {
      const querySnapshot = await loadNotesForUser(getCurrentUid()); // Use getter

      const newNotesCache = {};
      const newOpenTabs = [];
      querySnapshot.forEach((doc) => {
        const noteData = { id: doc.id, ...doc.data() };
        newNotesCache[doc.id] = noteData;
        newOpenTabs.push({ id: noteData.id, title: noteData.title });
      });
      setNotesCache(newNotesCache); // Use setter
      setOpenTabs(newOpenTabs); // Use setter

      if (getOpenTabs().length > 0) { // Use getter
        setActiveTabId(getOpenTabs()[0].id); // Use getter and setter
      } else {
        setActiveTabId(null); // Use setter
        handleNewTab(); 
      }
      renderTabsAndEditor();

    } catch (error) {
      console.error("Error loading initial notes: ", error);
      showStatus('Error loading notes. Check console.', 0, true);
    }
  }

  async function saveCurrentNote() {
    const currentActiveTabId = getActiveTabId(); // Use getter
    if (!currentActiveTabId || !getCurrentUid() || !isCurrentUserActive()) { // Use getters
      console.log('Save skipped: User not signed in, inactive, or no active tab.');
      return;
    }
    const title = noteTitleInput.value.trim() || 'Untitled';
    const content = noteContentInput.value.trim();

    const noteToSave = {
      title: title,
      content: content,
      userId: getCurrentUid() // Use getter
    };

    try {
      if (currentActiveTabId.startsWith('temp_id_')) {
        const docRef = await addNote(noteToSave); 
        const newFirestoreId = docRef.id;
        const newNoteForCache = { ...noteToSave, id: newFirestoreId, timestamp: { toDate: () => new Date() } };
        updateNoteInCache(newNoteForCache); // Use stateManager
        // Update the tab ID from temp to newFirestoreId and title in openTabs
        updateOpenTab(currentActiveTabId, { id: newFirestoreId, title: title });
        setActiveTabId(newFirestoreId); // Use setter
        showStatus('Note saved!', 1500);
      } else {
        await updateNote(currentActiveTabId, noteToSave);
        const updatedNoteForCache = { ...getNotesCache()[currentActiveTabId], ...noteToSave, timestamp: { toDate: () => new Date() } };
        updateNoteInCache(updatedNoteForCache); // Use stateManager
        // Update title in openTabs if it changed
        const tabInOpenTabs = getOpenTabs().find(t => t.id === currentActiveTabId);
        if (tabInOpenTabs && tabInOpenTabs.title !== title) {
            updateOpenTab(currentActiveTabId, { title: title });
        }
        showStatus('Note updated!', 1500);
      }
      renderTabsAndEditor();
    } catch (error) {
      console.error("Error saving note: ", error);
      showStatus('Error saving note. Check console.', 3000, true);
    }
  }

  async function deleteCurrentNote() {
    const currentActiveTabId = getActiveTabId(); // Use getter
    if (!currentActiveTabId) {
      showStatus('No active note to delete.', 3000, true);
      return;
    }
    if (userInfoPanel.style.display === 'block') {
        userInfoPanel.style.display = 'none';
        noteEditorArea.style.display = 'block';
    }

    const tabToDeleteId = currentActiveTabId;
    // No need for tabIndex directly if using stateManager functions to modify openTabs

    try {
      if (!tabToDeleteId.startsWith('temp_id_')) {
        await deleteNoteById(tabToDeleteId);
        removeNoteFromCache(tabToDeleteId); // Use stateManager
      }

      removeOpenTabById(tabToDeleteId); // Use stateManager

      const currentOpenTabs = getOpenTabs(); // Use getter
      if (currentOpenTabs.length === 0) {
        setActiveTabId(null); // Use setter
        handleNewTab();
      } else {
        // Determine new active tab; if deleted tab was last, select new last, else select same index
        const oldTabIndex = getOpenTabs().findIndex(t => t.id === tabToDeleteId); // Re-find index in potentially modified list for logic
                                                                                // This logic might need refinement based on desired UX
        let newActiveIndex = oldTabIndex;
        if (newActiveIndex >= currentOpenTabs.length) {
            newActiveIndex = currentOpenTabs.length - 1;
        }
        setActiveTabId(currentOpenTabs[newActiveIndex] ? currentOpenTabs[newActiveIndex].id : null);
      }
      renderTabsAndEditor();
      showStatus('Note deleted successfully.', 2000);

    } catch (error) {
      console.error("Error deleting note: ", error);
      showStatus('Error deleting note. Check console.', 0, true);
    }
  }

  // --- Auth UI Management ---
  // toggleAuthFormsDisplay is now imported from uiManager.js
  // updateAppUIForAuthState is now imported from uiManager.js

  // --- Auth Event Handlers ---
  async function handleSignUp(event) {
    event.preventDefault();
    const email = signupEmailInput.value;
    const password = signupPasswordInput.value;
    if (password.length < 6) {
      showStatus('Password should be at least 6 characters.', 0, true);
      return;
    }
    try {
      const userCredential = await signUpUser(email, password); // Use firebaseService
      const user = userCredential.user;
      const userProfile = { // createdAt is handled by firebaseService
        email: user.email,
        uid: user.uid,
        role: "client",
        isActive: true
      };
      await createUserProfile(user.uid, userProfile); // Use firebaseService
      showStatus('Account created! Please login.', 3000);
      signupForm.reset();
      toggleAuthFormsDisplay(true);
    } catch (error) {
      console.error("Error signing up:", error);
      showStatus(`Signup error: ${error.message}`, 0, true);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;
    try {
      await signInUser(email, password); // Use firebaseService
      showStatus('Logged in successfully!', 2000);
      loginForm.reset();
    } catch (error) {
      console.error("Error logging in:", error);
      showStatus(`Login error: ${error.message}`, 0, true);
    }
  }

  async function handleSignOut() {
    try {
      await signOutUser(); // Use firebaseService
      showStatus('Signed out successfully.', 2000);
      // onAuthChange callback will handle UI updates
    } catch (error) {
      console.error("Error signing out: ", error);
      showStatus(`Sign-out error: ${error.message}`, 0, true);
    }
  }

  // --- onAuthStateChanged Listener (now using onAuthChange from service) ---
  onAuthChange(async (user) => {
    if (user) {
      try {
        const docSnap = await getUserProfile(user.uid);
        let userProfileData;
        if (docSnap.exists()) {
          userProfileData = docSnap.data();
        } else {
          console.warn("User profile not found in Firestore for UID:", user.uid);
          userProfileData = { email: user.email, uid: user.uid, role: "client", isActive: true };
          await createUserProfile(user.uid, userProfileData); 
          showStatus('User profile created.', 2000);
        }
        setCurrentUser({ // Use stateManager
          uid: user.uid, 
          email: userProfileData.email, 
          role: userProfileData.role || "client", 
          isActive: typeof userProfileData.isActive === 'boolean' ? userProfileData.isActive : true
        });
        // Pass state via getters to uiManager function
        updateAppUIForAuthState(user, userProfileData, getNotesCache(), getOpenTabs(), getActiveTabId());
        if (isCurrentUserActive()) { // Use getter
          loadInitialNotes();
        }
      } catch (error) {
        console.error("Error fetching/creating user profile:", error);
        setCurrentUser({ uid: user.uid, email: user.email, role: "client", isActive: false }); // Update state
        updateAppUIForAuthState(user, { isActive: false, email: user.email }, getNotesCache(), getOpenTabs(), getActiveTabId());
        showStatus('Error with user profile.', 0, true);
      }
    } else {
      resetUserState(); // Use stateManager to clear all user and notes state
      clearEditorFields(); // uiManager
      // Pass current (cleared) state to uiManager function
      updateAppUIForAuthState(null, null, getNotesCache(), getOpenTabs(), getActiveTabId());
      showStatus('Please sign in or sign up.', 0);
    }
  });

  // --- Event Listeners ---
  newNoteTabButton.addEventListener('click', handleNewTab);
  deleteNoteAction.addEventListener('click', deleteCurrentNote);

  noteTitleInput.addEventListener('input', autoSaveNote);
  noteContentInput.addEventListener('input', autoSaveNote);

  userSettingsTabButton.addEventListener('click', () => {
    if (!isCurrentUserActive() && !getCurrentUid()) { // Use getters
        showStatus("Please log in to see user settings.", 2000, true);
        return;
    }
    if (userInfoPanel.style.display === 'none') {
      userInfoEmail.textContent = getCurrentUserEmail() || 'N/A'; // Use getter
      userInfoPanel.style.display = 'block';
      noteEditorArea.style.display = 'none';
    } else {
      userInfoPanel.style.display = 'none';
      noteEditorArea.style.display = 'block';
    }
  });

  logoutButton.addEventListener('click', handleSignOut);

  signupForm.addEventListener('submit', handleSignUp);
  loginForm.addEventListener('submit', handleLogin);

  showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    toggleAuthFormsDisplay(true);
  });
  showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    toggleAuthFormsDisplay(false);
  });
  
  // Initial UI state is set by onAuthStateChanged
});
