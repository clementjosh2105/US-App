import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomTabBar from '../components/BottomTabBar';
import ScoreScreen from './ScoreScreen';
import PostsScreen from './PostsScreen';
import ChatScreen from './ChatScreen';
import DatesScreen from './DatesScreen';
import PeriodTrackerScreen from './PeriodTrackerScreen';
import BucketListScreen from './BucketListScreen';
import NotificationsScreen from './NotificationsScreen';
import SettingsScreen from './SettingsScreen';
import NotificationPopup from '../components/NotificationPopup';
import NotificationDropdown from '../components/NotificationDropdown';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { AuthContext } from '../context/AuthContext';
import { Audio } from 'expo-av';
import { IG } from '../styles/theme';
import { registerForPushNotificationsAsync } from '../services/registerForPushNotificationsAsync';

const HomeScreen = () => {
    const { user, partner } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('Score');
    const [popupVisible, setPopupVisible] = useState(false);
    const [popupData, setPopupData] = useState({ message: '', icon: '', type: '' });
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    const coupleId = [user.id, partner.id].sort().join('_');

    // Audio
    useEffect(() => {
        Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
        }).catch(() => {});
    }, []);

    // Register push token after permissions are guaranteed
    useEffect(() => {
        registerForPushNotificationsAsync().then(token => {
            if (token && user.pushToken !== token) {
                updateDoc(doc(db, "users", user.id), { pushToken: token });
            }
        }).catch(err => console.log("[Home] Push token register error:", err));
    }, []);

    const playNotificationSound = async () => {
        try {
            const { sound } = await Audio.Sound.createAsync(
                require('../../assets/notification.mp3'),
                { shouldPlay: true }
            );
            await sound.playAsync();
        } catch (_) {}
    };

    // Real-time notifications
    useEffect(() => {
        const notifsRef = collection(db, 'notifications', coupleId, 'list');
        const q = query(notifsRef, orderBy('createdAt', 'desc'), limit(1));
        let isInitial = true;

        const unsub = onSnapshot(q, (snapshot) => {
            if (isInitial) { isInitial = false; return; }
            if (!snapshot.empty) {
                const change = snapshot.docChanges()[0];
                if (change?.type === 'added') {
                    const data = change.doc.data();
                    const created = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                    const diff = (new Date() - created) / 1000;
                    if (diff < 5 && data.message && !data.read && data.senderId !== user.id) {
                        setPopupData({ message: data.message, icon: data.icon, type: data.type });
                        setPopupVisible(true);
                        playNotificationSound();
                    }
                }
            }
        });
        return () => unsub();
    }, [coupleId]);

    const commonProps = {
        toggleMenu: () => {},          // no side menu anymore
        onNavigate: setActiveTab,
        onNotificationClick: () => setIsNotifOpen(true),
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'Score':         return <ScoreScreen {...commonProps} />;
            case 'Posts':         return <PostsScreen {...commonProps} />;
            case 'Chat':          return <ChatScreen {...commonProps} />;
            case 'Dates':         return <DatesScreen {...commonProps} />;
            case 'PeriodTracker': return <PeriodTrackerScreen {...commonProps} />;
            case 'BucketList':    return <BucketListScreen {...commonProps} />;
            case 'Notifications': return <NotificationsScreen {...commonProps} />;
            case 'Settings':      return <SettingsScreen {...commonProps} />;
            default:              return <ScoreScreen {...commonProps} />;
        }
    };

    const handlePopupPress = () => {
        switch (popupData.type) {
            case 'post':
            case 'music':    setActiveTab('Posts');        break;
            case 'chat':     setActiveTab('Chat');         break;
            case 'date':     setActiveTab('Dates');        break;
            case 'period':
            case 'intimacy': setActiveTab('PeriodTracker'); break;
            case 'emotion':  setActiveTab('Score');        break;
            default:
                if (popupData.message.includes('added a date')) setActiveTab('Dates');
                else if (popupData.message.includes('shared a new moment')) setActiveTab('Posts');
        }
    };

    return (
        <View style={styles.container}>
            <NotificationPopup
                visible={popupVisible}
                message={popupData.message}
                icon={popupData.icon}
                onClose={() => setPopupVisible(false)}
                onPress={handlePopupPress}
            />

            {isNotifOpen && (
                <NotificationDropdown
                    onClose={() => setIsNotifOpen(false)}
                    onNavigate={setActiveTab}
                />
            )}

            {/* Main content */}
            <View style={styles.content}>{renderContent()}</View>

            {/* Bottom tab bar */}
            <BottomTabBar activeTab={activeTab} onNavigate={setActiveTab} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: IG.background },
    content:   { flex: 1 },
});

export default HomeScreen;
