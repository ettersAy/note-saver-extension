// Example test mode rules:
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(YEAR, MONTH, DAY+30);
    }
  }
}
```"

The user might have:
1.  Not set the rules to test mode.
2.  Set up Firestore a while ago, and the 30-day test mode window has expired.
3.  Accidentally set more restrictive rules.
4.  The `notes` collection path in the rules might not match `match /{document=**}`
 if they have more specific rules. (Unlikely if they started with test mode).

The `popup.js` code tries to read from and write to a collection named `"notes"`:
`const notesCollectionRef = collection(db, "notes");`

The solution is to check and update the Firestore security rules in the Firebase console.

I need to guide the user to:
1.  Go to their Firebase project console.
2.  Navigate to Firestore Database -> Rules tab.
3.  Ensure the rules allow read/write access to the `notes` collection.
 For development, the simple test mode rules are usually sufficient.

I'll explain this and provide the example test rules again.
This is a great sign! The error `FirebaseError: [code=permission-denied]: Missing or insufficient permissions.` means your extension is successfully:
1.  Loading without CSP issues.
2.  Initializing Firebase.
3.  Attempting to communicate with Firestore.

The "permission-denied" error is coming directly from the Firebase servers, indicating that your **Firestore Security Rules** are not allowing the read (and potentially write) operations your extension is trying to perform on the `notes` collection.

Here's how to fix this:

1.  **Go to your Firebase Project Console:** Open your project at [https://console.firebase.google.com/](https://console.firebase.google.com/).
2.  **Navigate to Firestore Database:**
    *   In the left-hand menu, under "Build", click on "Firestore Database".
3.  **Go to the "Rules" Tab:**
    *   At the top of the Firestore Data viewer, you'll see tabs like "Data", "Rules", "Indexes", "Usage". Click on the **"Rules"** tab.

4.  **Update Your Security Rules:**
    *   You'll see an editor for your security rules. For development and testing, you can use rules that allow general access. A common set of rules for testing (often called "test mode") allows reads and writes for a limited time (e.g., 30 days from when you set them):

    ```javascript
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        // Allow read and write access to all documents for development
        // IMPORTANT: These rules are insecure for production.
        // For testing, you can use:
        // allow read, write: if true; 
        // Or, for time-limited test access (replace YYYY, MM, DD with a future date):
        // allow read, write: if request.time < timestamp.date(YYYY, MM, DD);

        // A common initial test rule (allows access for 30 days from now):
        match /{document=**} {
          allow read, write: if request.time < timestamp.now() + duration.time(30, 'd');
        }
      }
    }
    ```
    *   **Replace your current rules with the example above (the one with `timestamp.now() + duration.time(30, 'd')` is a good temporary one).**
    *   **Click "Publish"** to save your new rules. It might take a minute or two for the new rules to propagate.

**Important Considerations for Security Rules:**
*   The rules above are for **development and testing only**. They allow anyone to read and write to your entire database.
*   For a production application, you would write much more specific rules to secure your data, often based on user authentication (e.g., users can only read/write their own notes).
*   The `notes` collection your `popup.js` is trying to access will be covered by `match /{document=**}`.

After publishing these updated rules, wait a minute, then try using your extension again. The "permission-denied" error should be resolved if the rules are correctly allowing access.

##############

MCP Server Installation Steps:

1. Installation:

- Always install MCP servers globally: `npm install -g @package-name`
- Verify installation path: `dir "C:\Users\aetters\AppData\Roaming\npm\node_modules\@package-name"`

2. Configuration:

- Locate main server file (typically in dist/index.js or build/index.js)

- Use exact full path in configuration:

  ```javascript
  "command": "node",
  "args": ["C:\\Users\\aetters\\AppData\\Roaming\\npm\\node_modules\\@package-name\\dist\\index.js"]
  ```

- Always use double backslashes in Windows paths

3. Verification:

- Test server connection with basic tool call
- Check for error logs
- Validate all tools appear in available tools list

Key Reminders:

- Never assume npx will work reliably - use direct paths
- Windows paths require double backslashes in JSON
- Global npm modules install to AppData/Roaming/npm/node_modules
- Always verify the exact server file location before configuration


