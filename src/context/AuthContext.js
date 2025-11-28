import React, { createContext, useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

        return () => unsubscribeAuth();
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

    return (
        <AuthContext.Provider value={{ user, partner, isLoading, login, logout, connectPartner }}>
            {children}
        </AuthContext.Provider>
    );
};
