import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, FlatList } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { collection, query, getCountFromServer, onSnapshot, addDoc, orderBy } from 'firebase/firestore';

import { getRelationshipAdvice } from '../services/aiService';
import { sendNotification } from '../services/notificationService';

const ScoreScreen = ({ toggleMenu, onNavigate, onNotificationClick }) => {
    const { user, partner } = useContext(AuthContext);
    const [stats, setStats] = useState({
        posts: 0,
        chats: 0,
        dates: 0
    });

    const [emotionScore, setEmotionScore] = useState(0);
    const [emotionLogs, setEmotionLogs] = useState([]);

    const [loading, setLoading] = useState(true);
    const [advice, setAdvice] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedEmotion, setSelectedEmotion] = useState(null);
    const [comment, setComment] = useState('');

    const EMOTIONS = [
        { label: 'Loved', icon: '😍', value: 10, color: '#FFB7B2' },
        { label: 'Happy', icon: '😊', value: 5, color: '#FFDAC1' },
        { label: 'Neutral', icon: '😐', value: 2, color: '#E2F0CB' },
        { label: 'Sad', icon: '😢', value: -5, color: '#B5EAD7' },
        { label: 'Angry', icon: '😠', value: -10, color: '#C7CEEA' },
    ];

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
        });

        const unsubEmotions = onSnapshot(query(collection(db, 'emotions', coupleId, 'logs'), orderBy('createdAt', 'desc')), (snap) => {
            let total = 0;
            const logs = [];
            snap.forEach(doc => {
                const data = doc.data();
                total += data.value || 0;
                logs.push({ id: doc.id, ...data });
            });
            setEmotionScore(total);
            setEmotionLogs(logs);
            setLoading(false);
        });

        return () => {
            unsubPosts();
            unsubChats();
            unsubDates();
            unsubEmotions();
        };
    }, [coupleId]);

    const openEmotionModal = (emotion) => {
        setSelectedEmotion(emotion);
        setComment('');
        setModalVisible(true);
    };

    const saveEmotion = async () => {
        if (!selectedEmotion) return;

        try {
            await addDoc(collection(db, 'emotions', coupleId, 'logs'), {
                userId: user.id,
                userName: user.name,
                emotion: selectedEmotion.label,
                icon: selectedEmotion.icon,
                value: selectedEmotion.value,
                comment: comment,
                createdAt: new Date().toISOString()
            });

            await sendNotification(coupleId, user.id, user.name, `is feeling ${selectedEmotion.label} ${selectedEmotion.icon}`, 'emotion', selectedEmotion.icon);

            setModalVisible(false);
        } catch (error) {
            console.error("Error logging emotion:", error);
        }
    };

    // Calculate Score
    // Logic: 10 pts per Post, 1 pt per Message, 50 pts per Date
    // Calculate Score
    // Logic: Based on cumulative emotion values
    // Logic: Based on cumulative emotion values
    const score = emotionScore;

    let level = 'Newbie';
    if (score >= 100) level = 'Soulmates';
    else if (score >= 50) level = 'Deeply Connected';
    else if (score >= 20) level = 'Growing Strong';
    else level = 'Just Started';

    const handleGetAdvice = async () => {
        setAiLoading(true);
        // Get last 5 emotions
        const recentEmotions = emotionLogs.slice(0, 5).map(log => {
            return log.comment ? `${log.emotion} ("${log.comment}")` : log.emotion;
        });
        const result = await getRelationshipAdvice(score, level, recentEmotions);
        setAdvice(result);
        setAiLoading(false);
    };
    const getLevel = (s) => {
        if (s < 100) return "New Love 🌱";
        if (s < 500) return "Growing Strong 🌿";
        if (s < 1000) return "Deep Connection 💖";
        if (s < 5000) return "Soulmates 💍";
        return "Legendary Couple 👑";
    };

    useEffect(() => {
        if (!loading && !advice) {
            handleGetAdvice();
        }
    }, [loading, score]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={toggleMenu} style={styles.backButton}>
                    <Text style={styles.backButtonText}>☰</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Our Bond</Text>
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
                            <Text style={styles.scoreTitle}>Our Bond</Text>
                            <Text style={styles.scoreValue}>{score}</Text>
                            <Text style={styles.levelText}>{getLevel(score)}</Text>

                            {aiLoading ? (
                                <ActivityIndicator size="small" color="#779ECB" style={{ marginTop: 15 }} />
                            ) : advice ? (
                                <TouchableOpacity onPress={handleGetAdvice} style={styles.adviceBox}>
                                    <Text style={styles.adviceText}>{advice}</Text>
                                    <Text style={styles.refreshText}>Tap to refresh</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={handleGetAdvice} style={styles.getAdviceButton}>
                                    <Text style={styles.getAdviceButtonText}>Get Relationship Advice</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.emotionSection}>
                            <Text style={styles.sectionTitle}>How are you feeling today?</Text>
                            <View style={styles.emotionGrid}>
                                {EMOTIONS.map((emotion) => (
                                    <TouchableOpacity
                                        key={emotion.label}
                                        style={[styles.emotionButton, { backgroundColor: emotion.color }]}
                                        onPress={() => openEmotionModal(emotion)}
                                    >
                                        <Text style={styles.emotionIcon}>{emotion.icon}</Text>
                                        <Text style={styles.emotionLabel}>{emotion.label}</Text>
                                        <Text style={styles.emotionValue}>{emotion.value > 0 ? '+' : ''}{emotion.value}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Recent Activity</Text>
                        <View style={styles.logsList}>
                            {emotionLogs.slice(0, 5).map((log) => (
                                <View key={log.id} style={styles.logItem}>
                                    <Text style={styles.logIcon}>{log.icon}</Text>
                                    <View style={styles.logContent}>
                                        <Text style={styles.logHeader}>
                                            <Text style={styles.logUser}>{log.userId === user.id ? 'You' : log.userName}</Text> felt {log.emotion}
                                        </Text>
                                        {log.comment ? <Text style={styles.logComment}>"{log.comment}"</Text> : null}
                                        <Text style={styles.logTime}>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    </View>
                                    <Text style={[styles.logValue, { color: log.value > 0 ? '#4CAF50' : '#F44336' }]}>
                                        {log.value > 0 ? '+' : ''}{log.value}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        <Text style={styles.sectionTitle}>Activity Stats</Text>

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
                            <Text style={styles.infoText}>• Log your emotions daily to build your score.</Text>
                            <Text style={styles.infoText}>• Positive emotions increase your score.</Text>
                            <Text style={styles.infoText}>• Negative emotions decrease your score.</Text>
                        </View>
                    </>
                )}
            </ScrollView>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Why do you feel {selectedEmotion?.label}?</Text>
                        <Text style={styles.modalIcon}>{selectedEmotion?.icon}</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Add a comment (optional)..."
                            value={comment}
                            onChangeText={setComment}
                            multiline
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveButton} onPress={saveEmotion}>
                                <Text style={styles.saveButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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

    emotionSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    emotionGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    emotionButton: {
        width: '18%',
        aspectRatio: 0.8,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        padding: 5,
    },
    emotionIcon: {
        fontSize: 24,
        marginBottom: 5,
    },
    emotionLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#333',
    },
    emotionValue: {
        fontSize: 10,
        color: '#666',
    },
    logsList: {
        marginBottom: 20,
    },
    logItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
    },
    logIcon: {
        fontSize: 24,
        marginRight: 15,
    },
    logContent: {
        flex: 1,
    },
    logHeader: {
        fontSize: 14,
        color: '#333',
        marginBottom: 2,
    },
    logUser: {
        fontWeight: 'bold',
    },
    logComment: {
        fontSize: 14,
        fontStyle: 'italic',
        color: '#555',
        marginBottom: 2,
    },
    logTime: {
        fontSize: 10,
        color: '#999',
    },
    logValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        width: '80%',
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    modalIcon: {
        fontSize: 40,
        marginBottom: 20,
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 10,
        padding: 10,
        marginBottom: 20,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    cancelButton: {
        padding: 10,
        flex: 1,
        alignItems: 'center',
    },
    saveButton: {
        padding: 10,
        backgroundColor: '#779ECB',
        borderRadius: 10,
        flex: 1,
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    aiButton: {
        backgroundColor: 'white',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        marginTop: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    aiButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    adviceBox: {
        marginTop: 15,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 15,
        borderRadius: 10,
        width: '100%',
    },
    adviceText: {
        color: '#333',
        fontSize: 14,
        fontStyle: 'italic',
        lineHeight: 20,
        textAlign: 'center',
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: 'bold',
    },
    refreshText: {
        fontSize: 10,
        color: '#999',
        textAlign: 'center',
        marginTop: 5,
    },
    getAdviceButton: {
        marginTop: 15,
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        alignItems: 'center',
    },
    getAdviceButtonText: {
        color: '#779ECB',
        fontWeight: 'bold',
        fontSize: 12,
    },
});

export default ScoreScreen;
