// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  onSnapshot,
  addDoc,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  uploadBytesResumable
} from 'firebase/storage';

// ✅ USE HARDCODED VALUES FOR GITHUB PAGES
const firebaseConfig = {
  apiKey: "AIzaSyCVzXMWmdSU7kmCMVhNK4J5_dRENa98PkE",
  authDomain: "stem-education-9c439.firebaseapp.com",
  projectId: "stem-education-9c439",
  storageBucket: "stem-education-9c439.firebasestorage.app",
  messagingSenderId: "562966005597",
  appId: "1:562966005597:web:297fe41f89a5b8e9dc4ab4",
  measurementId: "G-Q1FVVKDMRT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export services
export {
  app,
  auth,
  db,
  storage,
  // Auth functions
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  // Firestore functions
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  onSnapshot,
  addDoc,
  Timestamp,
  writeBatch,
  // Storage functions
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  uploadBytesResumable
};
