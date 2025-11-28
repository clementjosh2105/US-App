import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';

const NotificationsScreen = ({ toggleMenu }) => {
    const { user, partner } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);

    const coupleId = [user.id, partner.id].sort().join('_');

    useEffect(() => {
        const notifsRef = collection(db, 'notifications', coupleId, 'list');
        const q = query(notifsRef, orderBy('createdAt', 'desc'), limit(20));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setNotifications(list);
        });

        return () => unsubscribe();
    }, [coupleId]);

    const renderItem = ({ item }) => (
        <View style={styles.notificationItem}>
            <Text style={styles.icon}>{item.icon || '🔔'}</Text>
            <View style={styles.content}>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.time}>
                    {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={toggleMenu} style={styles.backButton}>
                    <Text style={styles.backButtonText}>☰</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 30 }} />
            </View>

            <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No new notifications.</Text>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        padding: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: { padding: 5 },
    backButtonText: { fontSize: 24, color: '#333' },
    listContent: {
        padding: 15,
    },
    notificationItem: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 1,
    },
    icon: {
        fontSize: 24,
        marginRight: 15,
    },
    content: {
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
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: '#999',
    },
});

export default NotificationsScreen;
