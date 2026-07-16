import React, { useState, useEffect, useContext } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Modal, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { collection, query, onSnapshot, addDoc, orderBy } from 'firebase/firestore';
import { getRelationshipAdvice } from '../services/aiService';
import { sendNotification } from '../services/notificationService';
import { IG } from '../styles/theme';

const EMOTIONS = [
    { label: 'Loved',   icon: '😍', value:  10, bg: '#FFEEF2', accent: '#ED4956' },
    { label: 'Happy',   icon: '😊', value:   5, bg: '#FFF5E6', accent: '#FCB045' },
    { label: 'Neutral', icon: '😐', value:   2, bg: '#F0F0F0', accent: '#8E8E8E' },
    { label: 'Sad',     icon: '😢', value:  -5, bg: '#EEF4FF', accent: '#0095F6' },
    { label: 'Angry',   icon: '😠', value: -10, bg: '#FFF0F0', accent: '#ED4956' },
];

const getLevelInfo = (s) => {
    if (s < 20)   return { label: 'Just Started 🌱',       pct: Math.min(s / 20, 1) };
    if (s < 50)   return { label: 'Growing Strong 🌿',      pct: Math.min((s - 20) / 30, 1) };
    if (s < 100)  return { label: 'Deep Connection 💖',     pct: Math.min((s - 50) / 50, 1) };
    if (s < 500)  return { label: 'Soulmates 💍',            pct: Math.min((s - 100) / 400, 1) };
    return              { label: 'Legendary Couple 👑',     pct: 1 };
};

const ScoreScreen = ({ onNotificationClick, onNavigate }) => {
    const { user, partner } = useContext(AuthContext);
    const coupleId = [user.id, partner.id].sort().join('_');

    const [stats, setStats] = useState({ posts: 0, chats: 0, dates: 0 });
    const [emotionScore, setEmotionScore] = useState(0);
    const [emotionLogs, setEmotionLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [advice, setAdvice] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedEmotion, setSelectedEmotion] = useState(null);
    const [comment, setComment] = useState('');

    useEffect(() => {
        const unsubPosts   = onSnapshot(collection(db, 'posts',   coupleId, 'feed'),     snap => setStats(p => ({ ...p, posts:  snap.size })));
        const unsubChats   = onSnapshot(collection(db, 'chats',   coupleId, 'messages'), snap => setStats(p => ({ ...p, chats:  snap.size })));
        const unsubDates   = onSnapshot(collection(db, 'dates',   coupleId, 'events'),   snap => setStats(p => ({ ...p, dates:  snap.size })));
        const unsubEmotions = onSnapshot(
            query(collection(db, 'emotions', coupleId, 'logs'), orderBy('createdAt', 'desc')),
            snap => {
                let total = 0;
                const logs = [];
                snap.forEach(doc => { total += doc.data().value || 0; logs.push({ id: doc.id, ...doc.data() }); });
                setEmotionScore(total);
                setEmotionLogs(logs);
                setLoading(false);
            }
        );
        return () => { unsubPosts(); unsubChats(); unsubDates(); unsubEmotions(); };
    }, [coupleId]);

    useEffect(() => {
        if (!loading && !advice) handleGetAdvice();
    }, [loading]);

    const handleGetAdvice = async () => {
        setAiLoading(true);
        const recent = emotionLogs.slice(0, 5).map(l => l.comment ? `${l.emotion} ("${l.comment}")` : l.emotion);
        const { label } = getLevelInfo(emotionScore);
        const result = await getRelationshipAdvice(emotionScore, label, recent);
        setAdvice(result);
        setAiLoading(false);
    };

    const saveEmotion = async () => {
        if (!selectedEmotion) return;
        try {
            await addDoc(collection(db, 'emotions', coupleId, 'logs'), {
                userId: user.id, userName: user.name,
                emotion: selectedEmotion.label, icon: selectedEmotion.icon,
                value: selectedEmotion.value, comment,
                createdAt: new Date().toISOString(),
            });
            await sendNotification(coupleId, user.id, user.name, `is feeling ${selectedEmotion.label} ${selectedEmotion.icon}`, 'emotion', selectedEmotion.icon);
            setModalVisible(false);
        } catch (e) { console.error(e); }
    };

    const { label: levelLabel, pct } = getLevelInfo(emotionScore);

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerLogo}>US</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={onNotificationClick} style={styles.notifBtn}>
                        <Text style={styles.notifIcon}>🔔</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onNavigate('Settings')} style={styles.notifBtn}>
                        <Text style={styles.notifIcon}>⚙️</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {loading ? (
                    <ActivityIndicator color={IG.red} style={{ marginTop: 60 }} />
                ) : (
                    <>
                        {/* Bond Score Hero Card */}
                        <View style={styles.heroCard}>
                            <View style={styles.heroTop}>
                                <View>
                                    <Text style={styles.heroGreeting}>Hi, {user.name} 👋</Text>
                                    <Text style={styles.heroSub}>Connected with {partner.name}</Text>
                                </View>
                                <View style={styles.scoreBadge}>
                                    <Text style={styles.scoreNum}>{emotionScore}</Text>
                                    <Text style={styles.scoreLbl}>pts</Text>
                                </View>
                            </View>

                            <Text style={styles.levelLabel}>{levelLabel}</Text>

                            {/* Progress bar */}
                            <View style={styles.progressBg}>
                                <View style={[styles.progressFg, { width: `${Math.round(pct * 100)}%` }]} />
                            </View>

                            {/* AI advice */}
                            {aiLoading ? (
                                <ActivityIndicator size="small" color={IG.textSecondary} style={{ marginTop: 12 }} />
                            ) : advice ? (
                                <TouchableOpacity onPress={handleGetAdvice} style={styles.adviceRow}>
                                    <Text style={styles.adviceText}>✨ {advice}</Text>
                                    <Text style={styles.adviceRefresh}>↻ refresh</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        {/* Stats row */}
                        <View style={styles.statsRow}>
                            {[
                                { icon: '📸', val: stats.posts, lbl: 'Moments' },
                                { icon: '💬', val: stats.chats, lbl: 'Messages' },
                                { icon: '🗓', val: stats.dates, lbl: 'Dates' },
                            ].map(s => (
                                <View key={s.lbl} style={styles.statBox}>
                                    <Text style={styles.statIcon}>{s.icon}</Text>
                                    <Text style={styles.statVal}>{s.val}</Text>
                                    <Text style={styles.statLbl}>{s.lbl}</Text>
                                </View>
                            ))}
                        </View>

                        {/* How are you feeling */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>How are you feeling today?</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emotionScroll}>
                                {EMOTIONS.map(em => (
                                    <TouchableOpacity
                                        key={em.label}
                                        style={[styles.emotionChip, { backgroundColor: em.bg, borderColor: em.accent }]}
                                        onPress={() => { setSelectedEmotion(em); setComment(''); setModalVisible(true); }}
                                    >
                                        <Text style={styles.emotionEmoji}>{em.icon}</Text>
                                        <Text style={[styles.emotionLabel, { color: em.accent }]}>{em.label}</Text>
                                        <Text style={[styles.emotionVal, { color: em.accent }]}>
                                            {em.value > 0 ? '+' : ''}{em.value}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Recent activity */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Recent Activity</Text>
                            {emotionLogs.slice(0, 5).map(log => (
                                <View key={log.id} style={styles.logRow}>
                                    <Text style={styles.logEmoji}>{log.icon}</Text>
                                    <View style={styles.logBody}>
                                        <Text style={styles.logName}>
                                            {log.userId === user.id ? 'You' : log.userName}
                                            <Text style={styles.logMid}> felt {log.emotion}</Text>
                                        </Text>
                                        {log.comment ? <Text style={styles.logComment}>"{log.comment}"</Text> : null}
                                        <Text style={styles.logTime}>
                                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                    <Text style={[styles.logVal, { color: log.value > 0 ? '#23D160' : IG.red }]}>
                                        {log.value > 0 ? '+' : ''}{log.value}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Quick nav */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Explore</Text>
                            <View style={styles.quickNav}>
                                {[
                                    { id: 'PeriodTracker', icon: '🩸', label: 'Cycle & Intimacy' },
                                    { id: 'BucketList',   icon: '📝', label: 'Bucket List'     },
                                    { id: 'Settings',     icon: '⚙️', label: 'Settings'        },
                                ].map(item => (
                                    <TouchableOpacity key={item.id} style={styles.quickItem} onPress={() => onNavigate(item.id)}>
                                        <Text style={styles.quickIcon}>{item.icon}</Text>
                                        <Text style={styles.quickLabel}>{item.label}</Text>
                                        <Text style={styles.quickArrow}>›</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Emotion modal */}
            <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalEmoji}>{selectedEmotion?.icon}</Text>
                        <Text style={styles.modalTitle}>Why do you feel {selectedEmotion?.label}?</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Add a note (optional)..."
                            placeholderTextColor={IG.textMuted}
                            value={comment}
                            onChangeText={setComment}
                            multiline
                        />
                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                                <Text style={styles.modalCancelTxt}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSave} onPress={saveEmotion}>
                                <Text style={styles.modalSaveTxt}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe:       { flex: 1, backgroundColor: IG.background },
    header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: IG.white, borderBottomWidth: 0.5, borderBottomColor: IG.border },
    headerLogo: { fontSize: 26, fontWeight: '800', fontStyle: 'italic', color: IG.textPrimary, fontFamily: 'serif' },
    notifBtn:   { padding: 4 },
    notifIcon:  { fontSize: 22 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },

    // Hero
    heroCard:   { margin: 12, backgroundColor: IG.white, borderRadius: 16, padding: 20, borderWidth: 0.5, borderColor: IG.border },
    heroTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    heroGreeting: { fontSize: 18, fontWeight: '700', color: IG.textPrimary },
    heroSub:    { fontSize: 13, color: IG.textSecondary, marginTop: 2 },
    scoreBadge: { alignItems: 'center', backgroundColor: IG.background, borderRadius: 12, padding: 10, minWidth: 60 },
    scoreNum:   { fontSize: 28, fontWeight: '800', color: IG.textPrimary },
    scoreLbl:   { fontSize: 11, color: IG.textSecondary },
    levelLabel: { fontSize: 15, fontWeight: '600', color: IG.textPrimary, marginBottom: 10 },
    progressBg: { height: 6, backgroundColor: IG.border, borderRadius: 3, marginBottom: 14 },
    progressFg: { height: 6, backgroundColor: IG.textPrimary, borderRadius: 3 },
    adviceRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    adviceText: { flex: 1, fontSize: 13, color: IG.textSecondary, lineHeight: 18, fontStyle: 'italic' },
    adviceRefresh: { fontSize: 12, color: IG.blue, marginLeft: 8 },

    // Stats
    statsRow:   { flexDirection: 'row', marginHorizontal: 12, marginBottom: 4, backgroundColor: IG.white, borderRadius: 12, borderWidth: 0.5, borderColor: IG.border },
    statBox:    { flex: 1, alignItems: 'center', paddingVertical: 14, borderRightWidth: 0.5, borderRightColor: IG.border },
    statIcon:   { fontSize: 18, marginBottom: 4 },
    statVal:    { fontSize: 20, fontWeight: '800', color: IG.textPrimary },
    statLbl:    { fontSize: 11, color: IG.textSecondary, marginTop: 2 },

    // Section
    section:    { marginHorizontal: 12, marginTop: 16 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: IG.textPrimary, marginBottom: 12 },

    // Emotion chips
    emotionScroll: { marginBottom: 4 },
    emotionChip:   { alignItems: 'center', padding: 14, borderRadius: 16, marginRight: 10, borderWidth: 1, minWidth: 80 },
    emotionEmoji:  { fontSize: 28, marginBottom: 4 },
    emotionLabel:  { fontSize: 12, fontWeight: '600', marginBottom: 2 },
    emotionVal:    { fontSize: 11 },

    // Log rows
    logRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: IG.white, padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 0.5, borderColor: IG.border },
    logEmoji:   { fontSize: 24, marginRight: 12 },
    logBody:    { flex: 1 },
    logName:    { fontSize: 14, fontWeight: '700', color: IG.textPrimary },
    logMid:     { fontWeight: '400' },
    logComment: { fontSize: 13, color: IG.textSecondary, fontStyle: 'italic', marginTop: 2 },
    logTime:    { fontSize: 11, color: IG.textMuted, marginTop: 2 },
    logVal:     { fontSize: 16, fontWeight: '700' },

    // Quick nav
    quickNav:   { backgroundColor: IG.white, borderRadius: 12, borderWidth: 0.5, borderColor: IG.border, overflow: 'hidden', marginBottom: 24 },
    quickItem:  { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: IG.border },
    quickIcon:  { fontSize: 20, marginRight: 14 },
    quickLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: IG.textPrimary },
    quickArrow: { fontSize: 20, color: IG.textMuted },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalBox:   { backgroundColor: IG.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
    modalEmoji: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: IG.textPrimary, textAlign: 'center', marginBottom: 16 },
    modalInput: { backgroundColor: IG.background, borderRadius: 10, padding: 14, fontSize: 14, color: IG.textPrimary, borderWidth: 0.5, borderColor: IG.border, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
    modalBtns:  { flexDirection: 'row', gap: 12 },
    modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: IG.border, alignItems: 'center' },
    modalCancelTxt: { fontSize: 14, fontWeight: '600', color: IG.textPrimary },
    modalSave:  { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: IG.textPrimary, alignItems: 'center' },
    modalSaveTxt: { fontSize: 14, fontWeight: '600', color: IG.white },
});

export default ScoreScreen;
