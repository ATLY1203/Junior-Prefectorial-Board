// Authentication and User Management
import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Global state variables
let currentUser = null;
let userProfile = null;
let loadingAuth = true;

// Authentication functions
export const attemptSignup = async (event) => {
    event.preventDefault();
    
    const form = event.target;
    const email = form.email.value;
    const password = form.password.value;
    const userName = form.userName.value;
    const role = form.role.value;

    try {
        showMessageBox('Creating account...', 'info');
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create user profile in Firestore
        const userProfileData = {
            uid: user.uid,
            email: email,
            name: userName,
            role: role,
            createdAt: new Date(),
            averageRating: role === 'teacher' ? null : 0,
            totalRatings: role === 'teacher' ? null : 0
        };

        await setDoc(doc(db, 'userProfiles', user.uid), userProfileData);
        
        showMessageBox('Account created successfully!', 'success');
        hideMessageBox();
        
    } catch (error) {
        console.error('Signup error:', error);
        let errorMessage = 'Failed to create account.';
        
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email already in use.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak.';
        }
        
        showMessageBox(errorMessage, 'error');
    }
};

export const attemptLogin = async (event) => {
    event.preventDefault();
    
    const form = event.target;
    const email = form.email.value;
    const password = form.password.value;

    try {
        showMessageBox('Signing in...', 'info');
        
        await signInWithEmailAndPassword(auth, email, password);
        
        showMessageBox('Signed in successfully!', 'success');
        hideMessageBox();
        
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Failed to sign in.';
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'User not found.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password.';
        }
        
        showMessageBox(errorMessage, 'error');
    }
};

export const handleLogout = async () => {
    try {
        await signOut(auth);
        showMessageBox('Logged out successfully!', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showMessageBox('Failed to log out.', 'error');
    }
};

export const fetchUserProfile = async (uid) => {
    try {
        const userDoc = await getDoc(doc(db, 'userProfiles', uid));
        if (userDoc.exists()) {
            return userDoc.data();
        } else {
            console.error('User profile not found');
            return null;
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
};

// Auth state listener
export const initializeAuth = (onAuthStateChange) => {
    onAuthStateChanged(auth, async (user) => {
        console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
        
        if (user) {
            currentUser = user;
            userProfile = await fetchUserProfile(user.uid);
            console.log('User profile loaded:', userProfile);
        } else {
            currentUser = null;
            userProfile = null;
        }
        
        loadingAuth = false;
        onAuthStateChange();
    });
};

// Getters for global state
export const getCurrentUser = () => currentUser;
export const getUserProfile = () => userProfile;
export const isLoadingAuth = () => loadingAuth;

// Message box functions (imported from utils)
import { showMessageBox, hideMessageBox } from './utils.js'; 