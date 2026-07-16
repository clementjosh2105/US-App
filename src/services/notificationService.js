import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const sendNotification = async (coupleId, senderId, senderName, message, type, icon = '🔔') => {
    try {
        // 1. Add to Firestore (In-app notification)
        await addDoc(collection(db, 'notifications', coupleId, 'list'), {
            senderId,
            senderName,
            message,
            type, // 'post', 'chat', 'date', 'period', 'emotion', 'music'
            icon,
            read: false,
            createdAt: new Date().toISOString()
        });

        // 2. Send Push Notification
        // We need to find the partner's ID to get their push token.
        // The coupleId is "id1_id2". We know senderId.
        const ids = coupleId.split('_');
        const partnerId = ids.find(id => id !== senderId);

        if (partnerId) {
            const partnerDoc = await getDoc(doc(db, 'users', partnerId));
            if (partnerDoc.exists()) {
                const partnerData = partnerDoc.data();
                const pushToken = partnerData.pushToken;

                if (pushToken) {
                    await sendPushNotification(pushToken, senderName, message, { type, coupleId });
                }
            }
        }

    } catch (error) {
        console.error("Error sending notification:", error);
    }
};

async function sendPushNotification(expoPushToken, title, body, data) {
    const message = {
        to: expoPushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
    };

    await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
    });
}
