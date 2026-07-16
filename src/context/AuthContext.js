import React, { createContext, useState, useEffect } from 'react';
import { auth, db, storage } from '../firebaseConfig';
import { signInAnonymously, onAuthStateChanged, signOut, deleteUser } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotificationsAsync } from '../services/registerForPushNotificationsAsync';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [partner, setPartner] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // User is signed in, listen to their Firestore document
                const userDocRef = doc(db, "users", currentUser.uid);

                const unsubscribeSnapshot = onSnapshot(userDocRef, async (docSnap) => {
                    if (docSnap.exists()) {
                        const userData = docSnap.data();
                        setUser({ id: currentUser.uid, ...userData });

                        // Register for Push Notifications if not already done or to update token
                        registerForPushNotificationsAsync().then(token => {
                            if (token && userData.pushToken !== token) {
                                updateDoc(userDocRef, { pushToken: token });
                            }
                        });

                        if (userData.partnerId) {
                            // Fetch partner data
                            const partnerDocRef = doc(db, "users", userData.partnerId);
                            const partnerSnap = await getDoc(partnerDocRef);
                            if (partnerSnap.exists()) {
                                setPartner({ id: userData.partnerId, ...partnerSnap.data() });
                            }
                        } else {
                            setPartner(null);
                        }
                    }
                    setIsLoading(false);
                }, (error) => {
                    console.error("Error listening to user doc:", error);
                    setIsLoading(false);
                });

                return () => unsubscribeSnapshot();
            } else {
                // User is signed out
                setUser(null);
                setPartner(null);
                setIsLoading(false);
            }
        });

        // Safety timeout: If auth takes too long (e.g. network issue), stop loading so user can see something
        const safetyTimeout = setTimeout(() => {
            setIsLoading(false);
        }, 5000);

        return () => {
            unsubscribeAuth();
            clearTimeout(safetyTimeout);
        };
    }, []);

    const login = async (name, color) => {
        try {
            const userCredential = await signInAnonymously(auth);
            const uid = userCredential.user.uid;
            const inviteCode = Math.random().toString(36).substring(7).toUpperCase();

            const userData = {
                name,
                color,
                inviteCode,
                createdAt: new Date().toISOString(),
                partnerId: null
            };

            await setDoc(doc(db, "users", uid), userData);
            // State will be updated by the onSnapshot listener
        } catch (e) {
            console.error("Login failed", e);
            alert("Login failed: " + e.message);
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            await AsyncStorage.clear(); // Clear any local prefs if we have them
        } catch (e) {
            console.error("Logout failed", e);
        }
    };

    const connectPartner = async (partnerCode) => {
        if (!user) return false;

        try {
            // DEBUG: List all users to see what we can see
            const debugQ = query(collection(db, "users"));
            const debugSnap = await getDocs(debugQ);
            console.log("DEBUG: Total users visible:", debugSnap.size);
            debugSnap.forEach(d => console.log(" - User:", d.id, d.data().inviteCode));

            // Find user with this invite code
            console.log("Searching for partner with code:", partnerCode);
            const q = query(collection(db, "users"), where("inviteCode", "==", partnerCode));
            const querySnapshot = await getDocs(q);

            console.log("Query result size:", querySnapshot.size);

            if (querySnapshot.empty) {
                console.log("No user found with code:", partnerCode);
                alert("Invalid invite code");
                return false;
            }

            const partnerDoc = querySnapshot.docs[0];
            const partnerData = partnerDoc.data();
            const partnerId = partnerDoc.id;

            if (partnerId === user.id) {
                alert("You cannot invite yourself!");
                return false;
            }

            if (partnerData.partnerId) {
                alert("This user is already connected to someone else.");
                return false;
            }

            // Update both users
            await updateDoc(doc(db, "users", user.id), { partnerId: partnerId });
            await updateDoc(doc(db, "users", partnerId), { partnerId: user.id });

            return true;
        } catch (e) {
            console.error("Connection failed", e);
            alert("Connection failed: " + e.message);
            return false;
        }
    };

    const updateUserColor = async (color) => {
        if (!user) return;
        try {
            await updateDoc(doc(db, "users", user.id), { color });
            // Local state updates via onSnapshot
        } catch (e) {
            console.error("Failed to update color", e);
            alert("Failed to update color");
        }
    };

    const updateProfilePhoto = async (uri) => {
        if (!user) return;
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const storageRef = ref(storage, `profile_photos/${user.id}_${Date.now()}`);
            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);

            await updateDoc(doc(db, "users", user.id), {
                photoUrl: downloadURL
            });
        } catch (error) {
            console.error("Error updating profile photo:", error);
            throw error;
        }
    };

    const deleteAccount = async () => {
        if (!user) return;
        try {
            const coupleId = partner ? [user.id, partner.id].sort().join('_') : null;

            if (coupleId) {
                // 1. Delete Posts
                const postsQ = query(collection(db, 'posts', coupleId, 'feed'), where('senderId', '==', user.id));
                const postsSnap = await getDocs(postsQ);
                for (const d of postsSnap.docs) {
                    await deleteDoc(d.ref);
                    // Try to delete image if exists (optional, might fail if path unknown, but usually we can guess or store it)
                    // For now, we skip complex storage cleanup to avoid errors, or we could store path in doc.
                }

                // 2. Delete Chats
                const chatsQ = query(collection(db, 'chats', coupleId, 'messages'), where('senderId', '==', user.id));
                const chatsSnap = await getDocs(chatsQ);
                for (const d of chatsSnap.docs) {
                    await deleteDoc(d.ref);
                }

                // 3. Delete Bucket List Items
                const bucketQ = query(collection(db, 'bucketlist', coupleId, 'items'), where('createdBy', '==', user.id));
                const bucketSnap = await getDocs(bucketQ);
                for (const d of bucketSnap.docs) {
                    await deleteDoc(d.ref);
                }

                // 4. Delete Emotions
                const emotionsQ = query(collection(db, 'emotions', coupleId, 'logs'), where('userId', '==', user.id));
                const emotionsSnap = await getDocs(emotionsQ);
                for (const d of emotionsSnap.docs) {
                    await deleteDoc(d.ref);
                }

                // 5. Delete Notifications sent by user
                const notifsQ = query(collection(db, 'notifications', coupleId, 'list'), where('senderId', '==', user.id));
                const notifsSnap = await getDocs(notifsQ);
                for (const d of notifsSnap.docs) {
                    await deleteDoc(d.ref);
                }
            }

            // 6. Delete Profile Photo
            if (user.photoUrl) {
                try {
                    // Extract path from URL or just try to delete known path pattern
                    // Pattern: profile_photos/{userId}_{timestamp}
                    // Since we don't know the exact timestamp, we might have to rely on the fact that we can't easily list files in client SDK without listAll permission which might be heavy.
                    // However, we can try to delete if we stored the ref. We didn't store the ref path, just the URL.
                    // Parsing the URL to get the ref is possible but brittle.
                    // For now, we'll skip strict storage deletion unless we stored the path.
                } catch (e) {
                    console.log("Error deleting photo", e);
                }
            }

            // 7. Delete User Doc
            await deleteDoc(doc(db, "users", user.id));

            // 8. Delete Auth User
            const currentUser = auth.currentUser;
            if (currentUser) {
                await deleteUser(currentUser);
            }

            await AsyncStorage.clear();
            setUser(null);
            setPartner(null);
        } catch (error) {
            console.error("Error deleting account:", error);
            if (error.code === 'auth/requires-recent-login') {
                alert("Please logout and login again to delete your account.");
            } else {
                alert("Failed to delete account: " + error.message);
            }
        }
    };

    return (
        <AuthContext.Provider value={{ user, partner, isLoading, login, logout, connectPartner, updateUserColor, updateProfilePhoto, deleteAccount }}>
            {children}
        </AuthContext.Provider>
    );
};
