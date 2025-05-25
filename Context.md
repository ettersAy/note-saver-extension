**Project Context: "Note Saver" Brave Browser Extension (Tabbed Interface)**

**1. Core Functionality:**
   - A Brave browser extension (Manifest V3) that allows users to:
     - Write, save, load, and **delete** multiple text notes.
     - Assign a **title** to each note.
     - Manage notes in a **tabbed interface**, similar to browser tabs.
     - Create new notes, which open in new, initially "Untitled" tabs.
     - See the **last modified timestamp** for the currently active note.
   - Notes are persisted to a cloud database (Firebase Firestore).
   - On launch, the extension attempts to open the most recently modified note in a tab. If no notes exist, it opens a single new, empty tab.

**2. Technology Stack & Key Components:**
   - **Extension Framework:** Manifest V3 for Chrome/Brave extensions.
   - **Frontend:**
     - `popup.html`: The main UI for the extension's popup. It now features a tabbed layout:
       - `<div id="app-container">`: The main wrapper for the entire popup UI.
       - `<div id="tab-bar">`: Contains:
         - `<ul id="tabs-list">`: Dynamically populated with list items (`<li>`) representing open note tabs. Each tab displays the note's title.
         - `<button id="new-tab-button">`: A button (typically a "+") to create a new note tab.
         - `<div id="user-icon">`: A placeholder for potential future user-related features.
       - `<div id="note-editor-area">`: The main content area below the tab bar, displaying the details of the `activeTabId`. It includes:
         - An input field for the note title (`<input type="text" id="note-title">`).
         - A textarea for note content (`<textarea id="note-content">`).
         - `<div id="note-meta-actions">`: Contains buttons to save (`<button id="save-note">`) and delete (`<button id="delete-note">`) the current active note, and a span to display its last modified timestamp (`<span id="last-modified">`).
     - `popup.css`: Styles for `popup.html`, implementing the visual design of the tab bar, individual tabs (including active/hover states), the new tab button, user icon, and the note editor area.
     - `popup.js`: Core client-side logic for UI interaction and Firebase communication. This script is the entry point for Webpack bundling. Its responsibilities include:
       - Managing state variables:
         - `notesCache` (object): Stores fetched note data, keyed by note ID.
         - `openTabs` (array): An array of objects, where each object represents an open tab (e.g., `{ id: 'firestoreId' | 'temp_id_N', title: 'Note Title' }`).
         - `activeTabId` (string): Stores the ID of the currently focused tab.
         - `tempIdCounter` (number): Used to generate unique temporary IDs for new, unsaved tabs.
       - Performing full CRUD (Create, Read, Update, Delete) operations for notes in Firestore, contextualized by the active tab:
         - **Create:** New notes are initiated by creating a new tab (`handleNewTab`). Saving this tab for the first time (`saveCurrentNote`) adds a new document to Firestore and updates the tab's ID from temporary to the Firestore ID.
         - **Read:** On initial load (`loadInitialNotes`), fetches all notes, populates `notesCache`, and opens the most recent note in a tab (or a new tab if none exist).
         - **Update:** Saving changes (`saveCurrentNote`) to an existing note (identified by a Firestore `activeTabId`) updates the corresponding document in Firestore and the `notesCache`. The tab title in `openTabs` is also updated if the note's title changes.
         - **Delete:** Deleting the active note (`deleteCurrentNote`) removes it from Firestore (if saved), `notesCache`, and `openTabs`. Logic is in place to switch to an adjacent tab or open a new empty tab if the last one is closed.
       - Dynamically rendering tabs in the `tabs-listUL` based on the `openTabs` array (`renderTabs`).
       - Handling switching between tabs (`handleTabSwitch`), which updates `activeTabId` and re-renders the UI to load the selected tab's content into the editor area (`loadNoteIntoEditor`).
       - Managing the display of the active note's title, content, and formatted last modified timestamp.
   - **Backend (Storage):**
     - **Firebase Firestore:** Used as the database to store notes.
     - **Collection:** Notes are stored in a Firestore collection named `"notes"`. Each document typically contains:
       - `title` (string)
       - `content` (string)
       - `timestamp` (Firestore serverTimestamp)
   - **Build System & Package Management:**
     - **Node.js & npm:** Used for managing dependencies and running build scripts.
     - **Webpack:** Bundles JavaScript modules.
       - `firebase` SDK is installed via npm and bundled into the extension.
       - `popup.js` (using ES6 `import` for Firebase) is bundled into `dist/popup.bundle.js`.
     - **`dist/` folder:** The output directory for the bundled extension, which is loaded into Brave as an unpacked extension.

**3. Configuration Files & Structure:**
   - **`manifest.json` (in project root, copied to `dist/`):**
     - Defines the extension's properties, permissions, and UI.
     - `action.default_popup`: "popup.html"
     - `background.service_worker`: "background.js" (currently simple, copied as-is to `dist/`)
     - `content_security_policy`:
       `"extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' https://firestore.googleapis.com https://www.googleapis.com https://identitytoolkit.googleapis.com https://*.firebaseio.com;"`
   - **`package.json`:**
     - Manages npm dependencies: `firebase` (runtime), `webpack`, `webpack-cli`, `copy-webpack-plugin` (dev).
     - Contains `scripts`:
       - `"build": "webpack --mode production"`
       - `"dev": "webpack --mode development --watch"`
   - **`webpack.config.js`:**
     - Configures Webpack.
     - `entry`: `{ popup: './popup.js' }`
     - `output`: `path: 'dist'`, `filename: 'popup.bundle.js'`
     - Uses `CopyWebpackPlugin` to copy `popup.html`, `popup.css`, `manifest.json`, `background.js`, and `icons/` folder to the `dist/` directory.
   - **`popup.js` (source file):**
     - Uses ES6 `import` statements for Firebase modules. Key imports include:
       - `initializeApp` from 'firebase/app'.
       - From 'firebase/firestore': `getFirestore`, `collection`, `addDoc`, `getDocs`, `doc`, `setDoc`, `deleteDoc`, `query`, `orderBy`, `serverTimestamp`.
     - Contains the Firebase project configuration object.
     - Manages all DOM interactions for the tabbed interface and note editor.
     - Implements the logic for tab management, and saving, loading, updating, and deleting notes within the active tab context. Key functions include `loadInitialNotes`, `renderTabsAndEditor`, `handleTabSwitch`, `handleNewTab`, `saveCurrentNote`, `deleteCurrentNote`.
   - **`popup.html` (source file, copied to `dist/`):**
     - Defines the HTML structure for the tabbed interface as described above.
     - Loads the bundled script: `<script src="popup.bundle.js"></script>`.
     - Does NOT load Firebase SDK from CDN.

**4. Firebase Specifics:**
   - **Initialization:** Firebase is initialized in `popup.js` using the user's specific Firebase project configuration keys.
   - **Firestore Operations:** `popup.js` utilizes a broad range of Firestore functions, now contextualized by the active tab's state (new or existing note).
     - `collection()`: To reference the "notes" collection.
     - `addDoc()`: To create new notes (when saving a "temp" tab).
     - `getDocs()` with `query()` and `orderBy("timestamp", "desc")`: To fetch and sort all notes for initial population of `notesCache`.
     - `doc()`: To reference a specific note document by its ID.
     - `setDoc()` (with `{ merge: true }`): To update existing notes.
     - `deleteDoc()`: To delete notes.
     - `serverTimestamp()`: To record creation/modification times.
   - **Firestore Security Rules:** Managed directly in the Firebase console. For development, they are currently set to allow open read/write/delete access to the `notes/{noteId}` path. **These are insecure for production.**

**5. Development Workflow:**
   1. Edit source files (in the project root: `popup.js`, `popup.html`, `popup.css`, etc.).
   2. Run `npm run build` (or `npm run dev` for continuous building) in the terminal from the project root.
   3. In Brave (`brave://extensions/`):
      - Remove the old version of the extension (if loaded).
   5. Check the extension console and Brave's developer tools console for errors.
