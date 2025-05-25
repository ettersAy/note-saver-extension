// Import Firebase modules using ES6 import syntax
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  getDoc, // Added for fetching user profile
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  where
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword, // Added
  signInWithEmailAndPassword,   // Added
  signOut,
  onAuthStateChanged
  // GoogleAuthProvider, signInWithPopup removed
} from 'firebase/auth';

document.addEventListener('DOMContentLoaded', function () {
  // DOM Elements - Main App
  const noteTitleInput = document.getElementById('note-title');
  const noteContentInput = document.getElementById('note-content');
  // const saveNoteAction = document.getElementById('save-note-action'); // Removed for auto-save
  const newNoteTabButton = document.getElementById('new-note-tab-button'); // Renamed from new-tab-button
  const userSettingsTabButton = document.getElementById('user-settings-tab-button'); // Added
  const deleteNoteAction = document.getElementById('delete-note-action');
  const tabsListUL = document.getElementById('tabs-list');
  const statusMessageSpan = document.getElementById('status-message');
  const noteEditorArea = document.getElementById('note-editor-area'); // Added for toggling

  // DOM Elements - User Info Panel
  const userInfoPanel = document.getElementById('user-info-panel'); // Added
  const userInfoEmail = document.getElementById('user-info-email'); // Added
  const logoutButton = document.getElementById('logout-button'); // Added

  // DOM Elements - Auth
  const authSection = document.getElementById('auth-section');
  const mainAppContent = document.getElementById('main-app-content');

  const signupForm = document.getElementById('signup-form');
  const signupEmailInput = document.getElementById('signup-email');
  const signupPasswordInput = document.getElementById('signup-password');

  const loginForm = document.getElementById('login-form');
  const loginEmailInput = document.getElementById('login-email');
  const loginPasswordInput = document.getElementById('login-password');

  const showLoginLink = document.getElementById('show-login-link');
  const showSignupLink = document.getElementById('show-signup-link');

  const userStatusInTabBar = document.getElementById('user-status-in-tab-bar'); // This div might be empty or repurposed
  // const userEmailDisplayInTabBar = document.getElementById('user-email-display'); // Removed from HTML and JS logic

  // Firebase Config
  const firebaseConfig = {
    apiKey: "AIzaSyBGRymo2BuynPL1wm1AWuoMY46CGm18nhs",
    authDomain: "note-taker-3a957.firebaseapp.com",
    projectId: "note-taker-3a957",
    storageBucket: "note-taker-3a957.firebasestorage.app",
    messagingSenderId: "689493935947",
    appId: "1:689493935947:web:d508278603ec186ef58ace",
    measurementId: "G-NHEG6W50QB"
  };

  // Initialize Firebase
  let app;
  let db;
  let auth; // Firebase Auth instance
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    console.error("Firebase initialization error:", error);
    showStatus('Error initializing Firebase!', 0, true);
    return;
  }

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

  function showStatus(message, duration = 2000, isError = false) {
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

  function formatTimestamp(timestamp) {
    if (!timestamp || !timestamp.toDate) {
      return 'Not saved yet';
    }
    return timestamp.toDate().toLocaleString();
  }

  // --- Core Tab & Note Functions ---

  function renderTabsAndEditor() {
    renderTabs();
    loadNoteIntoEditor(activeTabId);
  }

  function renderTabs() {
    const currentActiveIdForRender = activeTabId; // Preserve active tab ID for this render cycle
    // Clear only note tabs, not action buttons if they were part of this UL (they are now separate li)
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

      li.addEventListener('click', () => handleTabSwitch(tab.id));
      // Insert before the first action button or append if no action buttons
      const firstActionButton = tabsListUL.querySelector('.tab-action-button');
      if (firstActionButton) {
        tabsListUL.insertBefore(li, firstActionButton);
      } else {
        tabsListUL.appendChild(li);
      }
    });
  }


  function loadNoteIntoEditor(noteId) {
    if (!noteId) {
      clearEditorFields();
      deleteNoteAction.style.pointerEvents = 'none';
      deleteNoteAction.style.opacity = '0.5';
      return;
    }

    const tabData = openTabs.find(t => t.id === noteId);
    if (!tabData) {
        clearEditorFields();
        return;
    }

    if (noteId.startsWith('temp_id_')) {
      noteTitleInput.value = tabData.title === 'Untitled' ? '' : tabData.title;
      noteContentInput.value = '';
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
        clearEditorFields();
      }
    }
  }

  function clearEditorFields() {
    noteTitleInput.value = '';
    noteContentInput.value = '';
  }

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
    if (!db || !currentUid || !currentUserIsActive) {
        const noteTabElements = tabsListUL.querySelectorAll('li:not(.tab-action-button)');
        noteTabElements.forEach(el => el.remove()); // Clear only note tabs
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
        notesCache = {};
        openTabs = [];
        activeTabId = null;
        clearEditorFields();
        return;
    }

    try {
      const notesCollectionRef = collection(db, "notes");
      const q = query(notesCollectionRef, where("userId", "==", currentUid), orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);

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
    if (!db || !activeTabId || !currentUid || !currentUserIsActive) {
      // Do not show status for auto-save, it can be annoying if it happens often
      console.log('Save skipped: User not signed in, inactive, or no active tab.');
      return;
    }
    const title = noteTitleInput.value.trim() || 'Untitled';
    const content = noteContentInput.value.trim();

    const noteData = {
      title: title,
      content: content,
      timestamp: serverTimestamp(),
      userId: currentUid
    };

    try {
      let currentTabInOpenTabs = openTabs.find(t => t.id === activeTabId);

      if (activeTabId.startsWith('temp_id_')) {
        const docRef = await addDoc(collection(db, "notes"), noteData);
        const newFirestoreId = docRef.id;
        notesCache[newFirestoreId] = { ...noteData, id: newFirestoreId, timestamp: { toDate: () => new Date() } };
        if(currentTabInOpenTabs) {
            currentTabInOpenTabs.id = newFirestoreId;
            currentTabInOpenTabs.title = title;
        }
        activeTabId = newFirestoreId;
        showStatus('Note saved!', 1500); // Briefer message for auto-save
      } else {
        const noteRef = doc(db, "notes", activeTabId);
        await setDoc(noteRef, noteData, { merge: true });
        notesCache[activeTabId] = { ...notesCache[activeTabId], ...noteData, timestamp: { toDate: () => new Date() } };
        if(currentTabInOpenTabs) {
            currentTabInOpenTabs.title = title;
        }
        showStatus('Note updated!', 1500); // Briefer message for auto-save
      }
      renderTabsAndEditor();
    } catch (error) {
      console.error("Error saving note (auto-save): ", error);
      showStatus('Error auto-saving. Check console.', 3000, true);
    }
  }

  async function deleteCurrentNote() {
    if (!db || !activeTabId) {
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
        const noteRef = doc(db, "notes", tabToDeleteId);
        await deleteDoc(noteRef);
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
  function toggleAuthFormsDisplay(showLogin) {
    if (showLogin) {
      loginForm.style.display = 'block';
      signupForm.style.display = 'none';
    } else {
      loginForm.style.display = 'none';
      signupForm.style.display = 'block';
    }
  }

  function updateAppUIForAuthState(user, profile) {
    if (user && profile && profile.isActive) {
      authSection.style.display = 'none';
      mainAppContent.style.display = 'flex';
      userStatusInTabBar.style.display = 'flex'; // This div is mostly empty now

      noteTitleInput.disabled = false;
      noteContentInput.disabled = false;
      newNoteTabButton.disabled = false;
      userSettingsTabButton.style.display = 'list-item'; // Or 'inline-block' based on final CSS for li
      noteEditorArea.style.display = 'block'; // Ensure editor is visible
      userInfoPanel.style.display = 'none'; // Ensure user panel is hidden
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
      notesCache = {}; openTabs = []; activeTabId = null; clearEditorFields();

      noteTitleInput.disabled = true;
      noteContentInput.disabled = true;
      deleteNoteAction.style.pointerEvents = 'none'; deleteNoteAction.style.opacity = '0.5';
      newNoteTabButton.disabled = true;
      userSettingsTabButton.style.display = 'list-item'; // Still show for logout
      noteEditorArea.style.display = 'block'; // Or hide if preferred for inactive
      userInfoPanel.style.display = 'none';
      showStatus('Account inactive.', 0, true);
    } else { // Logged out
      authSection.style.display = 'block';
      mainAppContent.style.display = 'none';
      userStatusInTabBar.style.display = 'none';
      toggleAuthFormsDisplay(true);

      const noteTabElements = tabsListUL.querySelectorAll('li:not(.tab-action-button)');
      noteTabElements.forEach(el => el.remove());
      notesCache = {}; openTabs = []; activeTabId = null; clearEditorFields();
      noteTitleInput.disabled = true;
      noteContentInput.disabled = true;
      deleteNoteAction.style.pointerEvents = 'none'; deleteNoteAction.style.opacity = '0.5';
      newNoteTabButton.disabled = true;
      userSettingsTabButton.style.display = 'none';
      noteEditorArea.style.display = 'block'; // Reset
      userInfoPanel.style.display = 'none'; // Reset
    }
  }

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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userProfile = {
        email: user.email,
        uid: user.uid,
        role: "client",
        isActive: true,
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, "users", user.uid), userProfile);
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
      await signInWithEmailAndPassword(auth, email, password);
      showStatus('Logged in successfully!', 2000);
      loginForm.reset();
    } catch (error) {
      console.error("Error logging in:", error);
      showStatus(`Login error: ${error.message}`, 0, true);
    }
  }

  async function handleSignOut() {
    try {
      await signOut(auth);
      showStatus('Signed out successfully.', 2000);
      // onAuthStateChanged will handle UI updates
    } catch (error) {
      console.error("Error signing out: ", error);
      showStatus(`Sign-out error: ${error.message}`, 0, true);
    }
  }

  // --- onAuthStateChanged Listener ---
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUid = user.uid;
      currentUserEmail = user.email; // Store email
      try {
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const profile = docSnap.data();
          currentUserRole = profile.role || "client";
          currentUserIsActive = typeof profile.isActive === 'boolean' ? profile.isActive : true;
          updateAppUIForAuthState(user, profile);
          if (currentUserIsActive) {
            loadInitialNotes();
          }
        } else {
          console.warn("User profile not found in Firestore for UID:", user.uid);
          currentUserRole = "client";
          currentUserIsActive = true;
          const userProfileData = { email: user.email, uid: user.uid, role: "client", isActive: true, createdAt: serverTimestamp() };
          await setDoc(doc(db, "users", user.uid), userProfileData, { merge: true });
          updateAppUIForAuthState(user, userProfileData); // Pass the newly created profile
          if (currentUserIsActive) loadInitialNotes(); // Load notes after profile creation
          showStatus('User profile created.', 2000);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        currentUserRole = "client"; currentUserIsActive = false;
        updateAppUIForAuthState(user, { isActive: false, email: user.email }); // Pass email for display
        showStatus('Error fetching user profile.', 0, true);
      }
    } else {
      currentUid = null;
      currentUserEmail = null;
      currentUserRole = null;
      currentUserIsActive = false;
      updateAppUIForAuthState(null, null);
      showStatus('Please sign in or sign up.', 0);
      userInfoPanel.style.display = 'none';
      noteEditorArea.style.display = 'block';
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
