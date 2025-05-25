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

document.addEventListener('DOMContentLoaded', function () {
  // Firebase instances (db, auth) are now imported from firebaseService.js
  // and initialized there.

  let notesCache = {};
  let openTabs = [];
  let activeTabId = null;
  let tempIdCounter = 0;
  let currentUid = null;
  let currentUserEmail = null; // Store user email
  let currentUserRole = null;
  let currentUserIsActive = false;
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
    // Use functions from uiManager, passing necessary state and callbacks
    renderTabs(openTabs, activeTabId, notesCache, handleTabSwitch);
    loadNoteIntoEditor(activeTabId, openTabs, notesCache);
  }

  // renderTabs is now imported from uiManager.js
  // loadNoteIntoEditor is now imported from uiManager.js
  // clearEditorFields is now imported from uiManager.js

  function handleTabSwitch(noteId) {
    if (noteId === activeTabId) return;
     // If user info panel is visible, hide it and show editor
    if (userInfoPanel.style.display === 'block') {
        userInfoPanel.style.display = 'none';
        noteEditorArea.style.display = 'block'; // Or 'flex'
    }
    activeTabId = noteId;
    renderTabsAndEditor();
  }

  function handleNewTab() {
    if (!currentUid || !currentUserIsActive) {
      showStatus('Please sign in and have an active account to create notes.', 3000, true);
      return;
    }
    // If user info panel is visible, hide it and show editor
    if (userInfoPanel.style.display === 'block') {
        userInfoPanel.style.display = 'none';
        noteEditorArea.style.display = 'block'; // Or 'flex'
    }

    const newTempId = `temp_id_${tempIdCounter++}`;
    openTabs.push({ id: newTempId, title: 'Untitled' });
    activeTabId = newTempId;
    renderTabsAndEditor();
    noteTitleInput.focus();
    showStatus('New note tab created.', 1500);
  }

  const autoSaveNote = debounce(async () => {
    if (activeTabId && currentUid && currentUserIsActive) { // Only save if there's an active tab and user is valid
      await saveCurrentNote();
    } else {
      console.log('Auto-save skipped: No active tab, user not signed in, or user inactive.');
    }
  }, 1500); // Auto-save after 1.5 seconds of inactivity


  async function loadInitialNotes() {
    // db instance is from firebaseService; check currentUid and currentUserIsActive
    if (!currentUid || !currentUserIsActive) {
        displayNotesUnavailableMessage(); // Use uiManager function
        notesCache = {};
        openTabs = [];
        activeTabId = null;
        clearEditorFields(); // Use uiManager function
        return;
    }

    try {
      // Use firebaseService to load notes
      const querySnapshot = await loadNotesForUser(currentUid);

      notesCache = {};
      openTabs = [];

      querySnapshot.forEach((doc) => {
        const noteData = { id: doc.id, ...doc.data() };
        notesCache[doc.id] = noteData;
        openTabs.push({ id: noteData.id, title: noteData.title });
      });

      if (openTabs.length > 0) {
        activeTabId = openTabs[0].id;
      } else {
        activeTabId = null;
        handleNewTab(); // Open one empty new tab if no notes exist
      }
      renderTabsAndEditor();

    } catch (error) {
      console.error("Error loading initial notes: ", error);
      showStatus('Error loading notes. Check console.', 0, true);
    }
  }

  async function saveCurrentNote() {
    // db instance is from firebaseService; check activeTabId, currentUid, currentUserIsActive
    if (!activeTabId || !currentUid || !currentUserIsActive) {
      // Do not show status for auto-save, it can be annoying if it happens often
      console.log('Save skipped: User not signed in, inactive, or no active tab.');
      return;
    }
    const title = noteTitleInput.value.trim() || 'Untitled';
    const content = noteContentInput.value.trim();

    const noteData = {
      title: title,
      content: content,
      // timestamp is handled by firebaseService
      userId: currentUid
    };

    try {
      let currentTabInOpenTabs = openTabs.find(t => t.id === activeTabId);

      if (activeTabId.startsWith('temp_id_')) {
        const docRef = await addNote(noteData); // Use firebaseService
        const newFirestoreId = docRef.id;
        // For cache, simulate a timestamp or fetch the note again if exact timestamp is crucial
        notesCache[newFirestoreId] = { ...noteData, id: newFirestoreId, timestamp: { toDate: () => new Date() } };
        if(currentTabInOpenTabs) {
            currentTabInOpenTabs.id = newFirestoreId;
            currentTabInOpenTabs.title = title;
        }
        activeTabId = newFirestoreId;
        showStatus('Note saved!', 1500);
      } else {
        await updateNote(activeTabId, noteData); // Use firebaseService
        notesCache[activeTabId] = { ...notesCache[activeTabId], ...noteData, timestamp: { toDate: () => new Date() } };
        if(currentTabInOpenTabs) {
            currentTabInOpenTabs.title = title;
        }
        showStatus('Note updated!', 1500);
      }
      renderTabsAndEditor();
    } catch (error) {
      console.error("Error saving note: ", error); // Removed (auto-save) from log
      showStatus('Error saving note. Check console.', 3000, true);
    }
  }

  async function deleteCurrentNote() {
    // db instance is from firebaseService; check activeTabId
    if (!activeTabId) {
      showStatus('No active note to delete.', 3000, true);
      return;
    }
    // If user info panel is visible, hide it and show editor
    if (userInfoPanel.style.display === 'block') {
        userInfoPanel.style.display = 'none';
        noteEditorArea.style.display = 'block';
    }

    const tabToDeleteId = activeTabId;
    const tabIndex = openTabs.findIndex(t => t.id === tabToDeleteId);

    try {
      if (!tabToDeleteId.startsWith('temp_id_')) {
        await deleteNoteById(tabToDeleteId); // Use firebaseService
        delete notesCache[tabToDeleteId];
      }

      openTabs.splice(tabIndex, 1);

      if (openTabs.length === 0) {
        activeTabId = null;
        handleNewTab();
      } else {
        if (tabIndex >= openTabs.length) {
          activeTabId = openTabs[openTabs.length - 1].id;
        } else {
          activeTabId = openTabs[tabIndex].id;
        }
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
      currentUid = user.uid;
      currentUserEmail = user.email; // Store email
      try {
        const docSnap = await getUserProfile(user.uid); // Use firebaseService
        if (docSnap.exists()) {
          const profile = docSnap.data();
          currentUserRole = profile.role || "client";
          currentUserIsActive = typeof profile.isActive === 'boolean' ? profile.isActive : true;
          // Call uiManager's updateAppUIForAuthState, passing necessary state
          updateAppUIForAuthState(user, profile, notesCache, openTabs, activeTabId);
          if (currentUserIsActive) {
            loadInitialNotes();
          }
        } else {
          console.warn("User profile not found in Firestore for UID:", user.uid);
          currentUserRole = "client";
          currentUserIsActive = true;
          const userProfileData = { email: user.email, uid: user.uid, role: "client", isActive: true };
          await createUserProfile(user.uid, userProfileData); 
          updateAppUIForAuthState(user, userProfileData, notesCache, openTabs, activeTabId);
          if (currentUserIsActive) loadInitialNotes();
          showStatus('User profile created.', 2000);
        }
      } catch (error) {
        console.error("Error fetching/creating user profile:", error);
        currentUserRole = "client"; currentUserIsActive = false;
        updateAppUIForAuthState(user, { isActive: false, email: user.email }, notesCache, openTabs, activeTabId);
        showStatus('Error with user profile.', 0, true);
      }
    } else {
      currentUid = null;
      currentUserEmail = null;
      currentUserRole = null;
      currentUserIsActive = false;
      // Clear state before updating UI for logged-out user
      notesCache = {}; 
      openTabs = []; 
      activeTabId = null;
      clearEditorFields();
      updateAppUIForAuthState(null, null, notesCache, openTabs, activeTabId);
      showStatus('Please sign in or sign up.', 0);
      // These might be redundant if updateAppUIForAuthState handles them for null user
      // userInfoPanel.style.display = 'none'; 
      // noteEditorArea.style.display = 'block';
    }
  });

  // --- Event Listeners ---
  newNoteTabButton.addEventListener('click', handleNewTab);
  deleteNoteAction.addEventListener('click', deleteCurrentNote);

  noteTitleInput.addEventListener('input', autoSaveNote);
  noteContentInput.addEventListener('input', autoSaveNote);

  userSettingsTabButton.addEventListener('click', () => {
    if (!currentUserIsActive && !currentUid) { // Do not show panel if not logged in or inactive
        showStatus("Please log in to see user settings.", 2000, true);
        return;
    }
    if (userInfoPanel.style.display === 'none') {
      userInfoEmail.textContent = currentUserEmail || 'N/A';
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
