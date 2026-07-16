import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─── Configure how notifications appear when app is in foreground ─────────────
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge:  true,
    }),
});

// ─── Setup notification channel (Android) and request permissions ─────────────
export async function setupNotifications() {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('us-couple', {
            name: 'US Couple Notifications',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#ED4956',
            sound: true,
        });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        return status === 'granted';
    }
    return true;
}

// ─── Fire an immediate local device notification ──────────────────────────────
export async function showLocalNotification(title, body, data = {}) {
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: true,
                data,
            },
            trigger: null, // fire immediately
        });
    } catch (e) {
        console.log('[Notif] Local notification error:', e);
    }
}

// ─── Main sendNotification — writes to Firestore + tries Expo push token ──────
export const sendNotification = async (coupleId, senderId, senderName, message, type, icon = '🔔') => {
    try {
        // 1. Write to Firestore (triggers real-time listener on partner's device)
        await addDoc(collection(db, 'notifications', coupleId, 'list'), {
            senderId,
            senderName,
            message,
            type,
            icon,
            read: false,
            createdAt: new Date().toISOString(),
        });

        // 2. Try Expo push token (works if partner's token is stored and they have internet)
        const ids = coupleId.split('_');
        const partnerId = ids.find(id => id !== senderId);

        if (partnerId) {
            const partnerDoc = await getDoc(doc(db, 'users', partnerId));
            if (partnerDoc.exists()) {
                const pushToken = partnerDoc.data()?.pushToken;
                if (pushToken && (pushToken.startsWith('ExpoPushToken') || pushToken.startsWith('ExponentPushToken'))) {
                    await _sendExpoPush(pushToken, senderName, message, { type, coupleId });
                }
            }
        }
    } catch (error) {
        console.error('[Notif] sendNotification error:', error);
    }
};

// ─── Expo Push (best-effort — works when token is available) ──────────────────
async function _sendExpoPush(expoPushToken, title, body, data) {
    try {
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to:    expoPushToken,
                sound: 'default',
                title,
                body,
                data,
                channelId: 'us-couple',
                priority: 'high',
            }),
        });
    } catch (e) {
        console.log('[Notif] Expo push error (non-fatal):', e);
    }
}
