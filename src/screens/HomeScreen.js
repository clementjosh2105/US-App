import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import SideMenu from '../components/SideMenu';
import DashboardScreen from './DashboardScreen';
import PostsScreen from './PostsScreen';
import ChatScreen from './ChatScreen';
import DatesScreen from './DatesScreen';
import PeriodTrackerScreen from './PeriodTrackerScreen';
import ScoreScreen from './ScoreScreen';
import NotificationsScreen from './NotificationsScreen';
import BucketListScreen from './BucketListScreen';
import SettingsScreen from './SettingsScreen';
import NotificationPopup from '../components/NotificationPopup';
import NotificationDropdown from '../components/NotificationDropdown';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { AuthContext } from '../context/AuthContext';
import { Audio } from 'expo-av';

const HomeScreen = () => {
    const { user, partner } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('Score'); // Default to Score
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Popup State
    const [popupVisible, setPopupVisible] = useState(false);
    const [popupData, setPopupData] = useState({ message: '', icon: '', type: '' });

    // Notification Dropdown State
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const toggleNotifications = () => setIsNotifOpen(!isNotifOpen);

    const coupleId = [user.id, partner.id].sort().join('_');

    // Sound Logic
    useEffect(() => {
        async function configureAudio() {
            try {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    playsInSilentModeIOS: true,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                });
            } catch (e) {
                console.log("Error configuring audio", e);
            }
        }
        configureAudio();
    }, []);

    const playNotificationSound = async () => {
        try {
            console.log("Attempting to play sound...");
            const { sound } = await Audio.Sound.createAsync(
                require('../../assets/notification.mp3'),
                { shouldPlay: true }
            );
            await sound.playAsync();
        } catch (error) {
            console.error("Sound playback failed:", error);
        }
    };

    useEffect(() => {
        // Listen for NEW notifications
        const notifsRef = collection(db, 'notifications', coupleId, 'list');
        const q = query(notifsRef, orderBy('createdAt', 'desc'), limit(1));

        let isInitial = true;

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (isInitial) {
                isInitial = false;
                return;
            }

            if (!snapshot.empty) {
                const change = snapshot.docChanges()[0];
                if (change && change.type === 'added') {
                    const data = change.doc.data();
                    // Double check it's recent (within 5s) to be sure
                    const now = new Date();
                    const created = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                    const diff = (now - created) / 1000;

                    if (diff < 5 && data.message && !data.read && data.senderId !== user.id) {
                        setPopupData({ message: data.message, icon: data.icon, type: data.type });
                        setPopupVisible(true);
                        playNotificationSound();
                    }
                }
            }
        });

        return () => unsubscribe();
    }, [coupleId]);

    const renderContent = () => {
        const props = {
            toggleMenu,
            onNavigate: setActiveTab,
            onNotificationClick: toggleNotifications
        };

        switch (activeTab) {
            case 'Score':
                return <ScoreScreen {...props} />;
            case 'Notifications':
                return <NotificationsScreen {...props} />;
            case 'Posts':
                return <PostsScreen {...props} />;
            case 'Chat':
                return <ChatScreen {...props} />;
            case 'Dates':
                return <DatesScreen {...props} />;
            case 'PeriodTracker':
                return <PeriodTrackerScreen {...props} />;
            case 'BucketList':
                return <BucketListScreen {...props} />;
            case 'Settings':
                return <SettingsScreen {...props} />;
            default:
                return <PostsScreen {...props} />;
        }
    };

    return (
        <View style={styles.container}>
            <NotificationPopup
                visible={popupVisible}
                message={popupData.message}
                icon={popupData.icon}
                onClose={() => setPopupVisible(false)}
                onPress={() => {
                    // Navigate based on type
                    switch (popupData.type) {
                        case 'post':
                        case 'music':
                            setActiveTab('Posts');
                            break;
                        case 'chat':
                            setActiveTab('Chat');
                            break;
                        case 'date':
                            setActiveTab('Dates');
                            break;
                        case 'period':
                            setActiveTab('PeriodTracker');
                            break;
                        case 'emotion':
                            setActiveTab('Score');
                            break;
                        default:
                            if (popupData.message.includes('added a date')) setActiveTab('Dates');
                            else if (popupData.message.includes('shared a new moment')) setActiveTab('Posts');
                            break;
                    }
                }}
            />

            {isNotifOpen && (
                <NotificationDropdown
                    onClose={() => setIsNotifOpen(false)}
                    onNavigate={setActiveTab}
                />
            )}

            <SideMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                onNavigate={setActiveTab}
                activeTab={activeTab}
            />
            <View style={styles.content}>
                {renderContent()}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
});

export default HomeScreen;
