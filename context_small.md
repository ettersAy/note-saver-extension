The "Note Saver" is a Brave browser extension (Manifest V3) that enables users to manage multiple text notes, each with a title and a last modified timestamp. Notes are stored in Firebase Firestore.

**Key Features:**
* **Note Management**: Users can write, save, load, and delete notes.
* **Firestore Integration**: Notes are persisted in a "notes" collection in Firebase Firestore, with each document containing a `title`, `content`, and `timestamp`.
* **User Interface**: `popup.html` provides the main UI with a notes list, note title input, content textarea, and action buttons (new, save, delete). The last modified timestamp is also displayed.
* **Client-Side Logic (`popup.js`)**: Manages a local `notesCache`, `currentNoteId`, and handles all CRUD operations (Create, Read, Update, Delete) with Firestore. It dynamically renders the notes list, loads selected notes, and clears the editor.
* **Timestamping**: Uses `serverTimestamp()` for accurate recording of modification times.

**Technology Stack:**
* **Extension Framework**: Manifest V3.
* **Frontend**: `popup.html`, `popup.css`, `popup.js`.
* **Backend/Storage**: Firebase Firestore.
* **Build System**: Node.js and npm for dependency management. Webpack bundles `popup.js` (including Firebase SDK) into `dist/popup.bundle.js`.
* **Dependencies**: `firebase` SDK is bundled, not loaded from CDN.

**Configuration and Structure:**
* **`manifest.json`**: Defines extension properties, permissions, `action.default_popup` as "popup.html", and a `content_security_policy` allowing connections to Firebase services.
* **`package.json`**: Lists `firebase`, `webpack`, `webpack-cli`, and `copy-webpack-plugin` as dependencies. Includes `build` and `dev` scripts for Webpack.
* **`webpack.config.js`**: Configures Webpack to bundle `popup.js` and copy necessary HTML, CSS, manifest, background script, and icons to the `dist/` folder.
* **`popup.js`**: Imports Firebase modules like `initializeApp`, `getFirestore`, `collection`, `addDoc`, `getDocs`, `doc`, `setDoc`, `deleteDoc`, `query`, `orderBy`, and `serverTimestamp`.
* **`dist/` folder**: Output directory for the bundled extension.

**Firebase Specifics:**
* Firebase is initialized in `popup.js` using project configuration keys.
* Firestore operations include `collection()`, `addDoc()`, `getDocs()` with `query()` and `orderBy()`, `doc()`, `setDoc()` (with `{ merge: true }`), `deleteDoc()`, and `serverTimestamp()`.
* **Security Rules**: Currently set to allow open read/write/delete access for development, which is insecure for production.

**Development Workflow:**
1.  Edit source files (e.g., `popup.js`, `popup.html`, `popup.css`).
2.  Run `npm run build` or `npm run dev`.
3.  Load the `dist/` folder as an unpacked extension in Brave (`brave://extensions/`).
4.  Thoroughly test all functionalities and check console for errors.