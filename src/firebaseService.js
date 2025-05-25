// Import Firebase modules using ES6 import syntax
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  where
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

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
let dbInstance;
let authInstance;

try {
  app = initializeApp(firebaseConfig);
  dbInstance = getFirestore(app);
  authInstance = getAuth(app);
} catch (error) {
  console.error("Firebase initialization error in firebaseService.js:", error);
  // Propagate the error or handle it as critical failure
  throw new Error("Failed to initialize Firebase. Application cannot start.");
}

// Export db and auth instances
export const db = dbInstance;
export const auth = authInstance;

// --- Firestore Note Operations ---
export async function addNote(noteData) {
  if (!db) throw new Error("Firestore not initialized");
  // Ensure userId is part of noteData and timestamp is handled
  const dataToSave = { ...noteData, timestamp: serverTimestamp() };
  return await addDoc(collection(db, "notes"), dataToSave);
}

export async function updateNote(noteId, noteData) {
  if (!db) throw new Error("Firestore not initialized");
  const noteRef = doc(db, "notes", noteId);
  // Ensure timestamp is updated
  const dataToUpdate = { ...noteData, timestamp: serverTimestamp() };
  return await setDoc(noteRef, dataToUpdate, { merge: true });
}

export async function deleteNoteById(noteId) {
  if (!db) throw new Error("Firestore not initialized");
  const noteRef = doc(db, "notes", noteId);
  return await deleteDoc(noteRef);
}

export async function loadNotesForUser(userId) {
  if (!db) throw new Error("Firestore not initialized");
  const notesCollectionRef = collection(db, "notes");
  const q = query(notesCollectionRef, where("userId", "==", userId), orderBy("timestamp", "desc"));
  return await getDocs(q);
}

// --- Auth Operations ---
export async function signUpUser(email, password) {
  if (!auth) throw new Error("Firebase Auth not initialized");
  return await createUserWithEmailAndPassword(auth, email, password);
}

export async function signInUser(email, password) {
  if (!auth) throw new Error("Firebase Auth not initialized");
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function signOutUser() {
  if (!auth) throw new Error("Firebase Auth not initialized");
  return await signOut(auth);
}

export function onAuthChange(callback) {
  if (!auth) throw new Error("Firebase Auth not initialized");
  return onAuthStateChanged(auth, callback);
}

// --- User Profile Operations ---
export async function getUserProfile(userId) {
  if (!db) throw new Error("Firestore not initialized");
  const userDocRef = doc(db, "users", userId);
  return await getDoc(userDocRef);
}

export async function createUserProfile(userId, profileData) {
  if (!db) throw new Error("Firestore not initialized");
  const userDocRef = doc(db, "users", userId);
  // Ensure createdAt timestamp is handled if new profile
  const dataToSave = { ...profileData, createdAt: serverTimestamp() };
  return await setDoc(userDocRef, dataToSave, { merge: true }); // merge true in case of partial updates later
}
