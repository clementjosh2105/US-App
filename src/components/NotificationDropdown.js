import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc, writeBatch } from 'firebase/firestore';

const NotificationDropdown = ({ onClose, onNavigate }) => {
    const { user, partner } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const coupleId = [user.id, partner.id].sort().join('_');

    useEffect(() => {
        const notifsRef = collection(db, 'notifications', coupleId, 'list');
        const q = query(notifsRef, orderBy('createdAt', 'desc'), limit(10));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .filter(item => item.senderId !== user.id); // Filter out own notifications
            setNotifications(list);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [coupleId]);

    const markAsRead = async (item) => {
        if (!item.read) {
            try {
                const notifRef = doc(db, 'notifications', coupleId, 'list', item.id);
                await updateDoc(notifRef, { read: true });
            } catch (error) {
                console.error("Error marking as read:", error);
            }
        }
        // Navigate if needed, e.g. to Posts or Dates
        if (item.message.includes('added a date')) {
            onNavigate('Dates');
        } else if (item.message.includes('shared a new moment')) {
            onNavigate('Posts');
        }
        onClose();
    };

    const markAllRead = async () => {
        const batch = writeBatch(db);
        notifications.forEach(item => {
            if (!item.read) {
                const ref = doc(db, 'notifications', coupleId, 'list', item.id);
                batch.update(ref, { read: true });
            }
        });
        await batch.commit();
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.item, !item.read && styles.unreadItem]}
            onPress={() => markAsRead(item)}
        >
            <Text style={styles.icon}>{item.icon}</Text>
            <View style={styles.textContainer}>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.time}>
                    {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </Text>
            </View>
            {!item.read && <View style={styles.dot} />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Notifications</Text>
                <TouchableOpacity onPress={markAllRead}>
                    <Text style={styles.markRead}>Mark all read</Text>
                </TouchableOpacity>
            </View>
            {loading ? (
                <ActivityIndicator color="#007AFF" style={{ padding: 20 }} />
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={<Text style={styles.empty}>No new notifications</Text>}
                    style={styles.list}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 90, // Below header
        right: 15,
        width: 300,
        backgroundColor: 'white',
        borderRadius: 15,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        zIndex: 2000,
        maxHeight: 400,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
        alignItems: 'center',
    },
    unreadItem: {
        backgroundColor: '#f0f9ff',
    },
    icon: {
        fontSize: 24,
        marginRight: 15,
    },
    textContainer: {
        flex: 1,
    },
    message: {
        fontSize: 14,
        color: '#333',
        marginBottom: 4,
    },
    time: {
        fontSize: 10,
        color: '#999',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#007AFF',
        marginLeft: 10,
    },
    empty: {
        padding: 20,
        textAlign: 'center',
        color: '#999',
    },
});

export default NotificationDropdown;
