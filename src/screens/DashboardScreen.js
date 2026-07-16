import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getTheme } from '../styles/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../firebaseConfig';
import { collection, query, onSnapshot } from 'firebase/firestore';

const DashboardScreen = ({ onNavigate }) => {
    const { user, partner, logout } = useContext(AuthContext);
    const theme = getTheme(user.color);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState('Newbie');

    const coupleId = [user.id, partner.id].sort().join('_');

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'emotions', coupleId, 'logs'), (snap) => {
            let total = 0;
            snap.forEach(doc => {
                total += doc.data().value || 0;
            });
            setScore(total);

            // Determine Level
            if (total >= 100) setLevel('Soulmates');
            else if (total >= 50) setLevel('Deeply Connected');
            else if (total >= 20) setLevel('Growing Strong');
            else setLevel('Just Started');
        });

        return () => unsub();
    }, [coupleId]);

    const features = [
        { id: 'Chat', title: 'Chat', icon: '💬' },
        { id: 'Posts', title: 'Posts', icon: '📸' },
        { id: 'Dates', title: 'Special Dates', icon: '📅' },
        { id: 'PeriodTracker', title: 'Period Tracker', icon: '🩸' },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.greeting, { color: theme.text }]}>Hi, {user.name}!</Text>
                    <Text style={styles.subGreeting}>Connected with {partner.name}</Text>
                </View>
                <TouchableOpacity onPress={logout} style={styles.logoutButton}>
                    <Text style={{ color: theme.primary }}>Logout</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <TouchableOpacity
                    style={[styles.statusCard, { backgroundColor: theme.primary }]}
                    onPress={() => onNavigate('Score')}
                >
                    <Text style={styles.statusTitle}>{level}</Text>
                    <Text style={styles.statusText}>
                        Relationship Score: {score}
                    </Text>
                    <Text style={[styles.statusText, { fontSize: 12, marginTop: 5, opacity: 0.8 }]}>
                        Tap to view details
                    </Text>
                </TouchableOpacity>

                <Text style={[styles.sectionTitle, { color: theme.text }]}>Explore</Text>

                <View style={styles.grid}>
                    {features.map((feature) => (
                        <TouchableOpacity
                            key={feature.id}
                            style={styles.card}
                            onPress={() => onNavigate(feature.id)}
                        >
                            <Text style={styles.cardIcon}>{feature.icon}</Text>
                            <Text style={[styles.cardTitle, { color: theme.text }]}>{feature.title}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    greeting: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    subGreeting: {
        fontSize: 14,
        color: '#666',
    },
    logoutButton: {
        padding: 10,
    },
    content: {
        padding: 20,
    },
    statusCard: {
        padding: 20,
        borderRadius: 20,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    statusTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    statusText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    grid: {
        flexDirection: 'column',
    },
    card: {
        width: '100%',
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 15,
        marginBottom: 15,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardIcon: {
        fontSize: 32,
        marginRight: 20,
        marginBottom: 0,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },

});

export default DashboardScreen;
