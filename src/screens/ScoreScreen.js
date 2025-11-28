import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { collection, query, getCountFromServer, onSnapshot } from 'firebase/firestore';

const ScoreScreen = ({ toggleMenu, onNavigate, onNotificationClick }) => {
    const { user, partner } = useContext(AuthContext);
    const [stats, setStats] = useState({
        posts: 0,
        chats: 0,
        dates: 0
    });
    const [loading, setLoading] = useState(true);

    const coupleId = [user.id, partner.id].sort().join('_');

    useEffect(() => {
        // We use real-time listeners for immediate updates
        const unsubPosts = onSnapshot(collection(db, 'posts', coupleId, 'feed'), (snap) => {
            setStats(prev => ({ ...prev, posts: snap.size }));
        });

        const unsubChats = onSnapshot(collection(db, 'chats', coupleId, 'messages'), (snap) => {
            setStats(prev => ({ ...prev, chats: snap.size }));
        });

        const unsubDates = onSnapshot(collection(db, 'dates', coupleId, 'events'), (snap) => {
            setStats(prev => ({ ...prev, dates: snap.size }));
            setLoading(false);
        });

        return () => {
            unsubPosts();
            unsubChats();
            unsubDates();
        };
    }, [coupleId]);

    // Calculate Score
    // Logic: 10 pts per Post, 1 pt per Message, 50 pts per Date
    const score = (stats.posts * 10) + (stats.chats * 1) + (stats.dates * 50);

    // Determine Level/Status based on score
    const getLevel = (s) => {
        if (s < 100) return "New Love 🌱";
        if (s < 500) return "Growing Strong 🌿";
        if (s < 1000) return "Deep Connection 💖";
        if (s < 5000) return "Soulmates 💍";
        return "Legendary Couple 👑";
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={toggleMenu} style={styles.backButton}>
                    <Text style={styles.backButtonText}>☰</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Relationship Score</Text>
                <TouchableOpacity onPress={onNotificationClick} style={styles.backButton}>
                    <Text style={styles.backButtonText}>🔔</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {loading ? (
                    <ActivityIndicator size="large" color="#FF6B6B" />
                ) : (
                    <>
                        <View style={styles.scoreCard}>
                            <Text style={styles.scoreTitle}>Total Score</Text>
                            <Text style={styles.scoreValue}>{score}</Text>
                            <Text style={styles.levelText}>{getLevel(score)}</Text>
                        </View>

                        <View style={styles.statsGrid}>
                            <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
                                <Text style={styles.statIcon}>📸</Text>
                                <Text style={styles.statValue}>{stats.posts}</Text>
                                <Text style={styles.statLabel}>Moments</Text>
                            </View>
                            <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
                                <Text style={styles.statIcon}>💬</Text>
                                <Text style={styles.statValue}>{stats.chats}</Text>
                                <Text style={styles.statLabel}>Messages</Text>
                            </View>
                            <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
                                <Text style={styles.statIcon}>📅</Text>
                                <Text style={styles.statValue}>{stats.dates}</Text>
                                <Text style={styles.statLabel}>Dates</Text>
                            </View>
                        </View>

                        <View style={styles.infoCard}>
                            <Text style={styles.infoTitle}>How it works</Text>
                            <Text style={styles.infoText}>• Share a Moment: +10 pts</Text>
                            <Text style={styles.infoText}>• Send a Message: +1 pt</Text>
                            <Text style={styles.infoText}>• Add a Date: +50 pts</Text>
                        </View>
                    </>
                )}
            </ScrollView>
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
        fontSize: 20,
        fontWeight: 'bold',
    },
    backButton: { padding: 5 },
    backButtonText: { fontSize: 24, color: '#333' },
    content: {
        padding: 15,
    },
    scoreCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        marginBottom: 15,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    scoreTitle: {
        fontSize: 14,
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    scoreValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FF6B6B',
        marginVertical: 5,
    },
    levelText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    statCard: {
        width: '31%',
        padding: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    statIcon: {
        fontSize: 20,
        marginBottom: 2,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 11,
        color: '#666',
    },
    infoCard: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
});

export default ScoreScreen;
