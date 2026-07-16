import React, { useState, useEffect, useContext } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Modal, TextInput, Platform
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import {
    collection, query, orderBy, onSnapshot,
    addDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';
import { getRemedySuggestion, getCyclePredictions, getPartnerAdvice } from '../services/aiService';
import { sendNotification } from '../services/notificationService';
import { IG } from '../styles/theme';

// ─── Color constants ──────────────────────────────────────────────────────────
const C = {
    period:    '#ED4956',
    predicted: '#FFB3BA',
    ovulation: '#833AB4',
    fertile:   '#D6A4F7',
    intimacy:  '#FCB045',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const toDateStr = (d) => d.toISOString().split('T')[0];

const addDays = (dateStr, n) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + n);
    return toDateStr(d);
};

const daysBetween = (a, b) =>
    Math.round((new Date(b) - new Date(a)) / 86400000);

const PeriodTrackerScreen = ({ toggleMenu, onNotificationClick }) => {
    const { user, partner } = useContext(AuthContext);
    const coupleId = [user.id, partner.id].sort().join('_');

    // ─── State ────────────────────────────────────────────────────────────────
    const [periodLogs,   setPeriodLogs]   = useState([]);
    const [intimacyLogs, setIntimacyLogs] = useState([]);
    const [markedDates,  setMarkedDates]  = useState({});
    const [predictions,  setPredictions]  = useState(null);
    const [partnerAdvice, setPartnerAdvice] = useState('');
    const [loading,      setLoading]      = useState(true);
    const [aiLoading,    setAiLoading]    = useState(false);
    const [suggestion,   setSuggestion]   = useState('');

    // modal
    const [modal, setModal] = useState({ visible: false, date: null, type: null }); // type: 'period'|'intimacy'|'deletePeriod'|'deleteIntimacy'
    const [selectedLogId, setSelectedLogId] = useState(null);

    // tab: 'cycle' | 'intimacy'
    const [activeTab, setActiveTab] = useState('cycle');

    // ─── Firebase listeners ───────────────────────────────────────────────────
    useEffect(() => {
        const unsubPeriod = onSnapshot(
            query(collection(db, 'periods', coupleId, 'logs'), orderBy('date', 'asc')),
            (snap) => {
                const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setPeriodLogs(logs);
                setLoading(false);
            }
        );

        const unsubIntimacy = onSnapshot(
            query(collection(db, 'intimacy', coupleId, 'logs'), orderBy('date', 'asc')),
            (snap) => {
                const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setIntimacyLogs(logs);
            }
        );

        return () => { unsubPeriod(); unsubIntimacy(); };
    }, [coupleId]);

    // ─── Prediction when logs change ─────────────────────────────────────────
    useEffect(() => {
        if (periodLogs.length > 0) {
            const last = periodLogs[periodLogs.length - 1];
            fetchPredictions(last.date);
        }
    }, [periodLogs]);

    useEffect(() => {
        rebuildCalendar(periodLogs, intimacyLogs, predictions);
    }, [periodLogs, intimacyLogs, predictions]);

    // ─── Partner advice ───────────────────────────────────────────────────────
    useEffect(() => {
        if (periodLogs.length > 0) {
            const last = periodLogs[periodLogs.length - 1];
            const diffDays = daysBetween(last.date, toDateStr(new Date())) + 1;
            let phase = 'Follicular';
            if (diffDays <= 5) phase = 'Menstrual';
            else if (diffDays >= 12 && diffDays <= 16) phase = 'Ovulation';
            else if (diffDays > 16) phase = 'Luteal';
            if (diffDays > 0 && diffDays <= 35) {
                getPartnerAdvice(diffDays, phase).then(a => { if (a) setPartnerAdvice(a); });
            }
        }
    }, [periodLogs]);

    // ─── Calendar builder ─────────────────────────────────────────────────────
    const rebuildCalendar = (pLogs, iLogs, preds) => {
        const marks = {};

        // Period days (5-day duration per log)
        pLogs.forEach(l => {
            for (let i = 0; i < 5; i++) {
                const d = addDays(l.date, i);
                marks[d] = { selected: true, selectedColor: C.period, marked: false };
            }
        });

        // Predictions
        if (preds) {
            if (preds.nextPeriod)
                marks[preds.nextPeriod] = { selected: true, selectedColor: C.predicted };
            if (preds.ovulation)
                marks[preds.ovulation] = { selected: true, selectedColor: C.ovulation };
            if (preds.fertileStart && preds.fertileEnd) {
                let cur = new Date(preds.fertileStart);
                const end = new Date(preds.fertileEnd);
                while (cur <= end) {
                    const ds = toDateStr(cur);
                    if (!marks[ds]) marks[ds] = { selected: true, selectedColor: C.fertile };
                    cur.setDate(cur.getDate() + 1);
                }
            }
        }

        // Intimacy dots — show as dot below the date
        iLogs.forEach(l => {
            if (marks[l.date]) {
                marks[l.date] = { ...marks[l.date], marked: true, dotColor: C.intimacy };
            } else {
                marks[l.date] = { marked: true, dotColor: C.intimacy };
            }
        });

        setMarkedDates(marks);
    };

    const fetchPredictions = async (lastDate) => {
        try {
            const result = await getCyclePredictions(lastDate);
            if (result) setPredictions(result);
        } catch (e) { /* silent */ }
    };

    // ─── Day press ────────────────────────────────────────────────────────────
    const handleDayPress = (day) => {
        const ds = day.dateString;

        if (activeTab === 'cycle') {
            const existing = periodLogs.find(l => l.date === ds);
            if (existing) {
                setSelectedLogId(existing.id);
                setModal({ visible: true, date: ds, type: 'deletePeriod' });
                return;
            }
            // Warn if recent
            const recent = periodLogs.find(l => Math.abs(daysBetween(l.date, ds)) < 20);
            if (recent) {
                Alert.alert(
                    'Recent Log Found',
                    `You already logged a period on ${recent.date}. Log anyway?`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Log It', onPress: () => setModal({ visible: true, date: ds, type: 'period' }) }
                    ]
                );
            } else {
                setModal({ visible: true, date: ds, type: 'period' });
            }
        } else {
            // Intimacy tab
            const existing = intimacyLogs.find(l => l.date === ds);
            if (existing) {
                setSelectedLogId(existing.id);
                setModal({ visible: true, date: ds, type: 'deleteIntimacy' });
            } else {
                setModal({ visible: true, date: ds, type: 'intimacy' });
            }
        }
    };

    // ─── Confirm modal action ─────────────────────────────────────────────────
    const handleConfirm = async () => {
        const { date, type } = modal;
        setModal({ ...modal, visible: false });

        try {
            if (type === 'period') {
                await addDoc(collection(db, 'periods', coupleId, 'logs'), {
                    date,
                    userId: user.id,
                    createdAt: new Date().toISOString(),
                });
                await sendNotification(coupleId, user.id, user.name, `logged period start: ${date}`, 'period', '🩸');
            } else if (type === 'deletePeriod') {
                await deleteDoc(doc(db, 'periods', coupleId, 'logs', selectedLogId));
            } else if (type === 'intimacy') {
                await addDoc(collection(db, 'intimacy', coupleId, 'logs'), {
                    date,
                    loggedBy: user.id,
                    loggedByName: user.name,
                    createdAt: new Date().toISOString(),
                });
                await sendNotification(coupleId, user.id, user.name, `marked an intimate moment on ${date} 💛`, 'intimacy', '💛');
            } else if (type === 'deleteIntimacy') {
                await deleteDoc(doc(db, 'intimacy', coupleId, 'logs', selectedLogId));
            }
        } catch (e) {
            Alert.alert('Error', 'Could not save. Please try again.');
        }
    };

    // ─── AI Remedy ────────────────────────────────────────────────────────────
    const getAiAdvice = async () => {
        setAiLoading(true);
        const advice = await getRemedySuggestion('period cramps and mood swings');
        setSuggestion(advice);
        setAiLoading(false);
    };

    // ─── Ovulation Info Card ──────────────────────────────────────────────────
    const renderOvulationCard = () => {
        if (!predictions) return null;
        const today = toDateStr(new Date());
        const daysToOv = predictions.ovulation ? daysBetween(today, predictions.ovulation) : null;
        const daysToNext = predictions.nextPeriod ? daysBetween(today, predictions.nextPeriod) : null;

        return (
            <View style={styles.ovCard}>
                <Text style={styles.ovTitle}>🔮 Cycle Predictions</Text>
                <View style={styles.ovRow}>
                    <View style={styles.ovItem}>
                        <Text style={styles.ovEmoji}>🩸</Text>
                        <Text style={styles.ovLabel}>Next Period</Text>
                        <Text style={styles.ovDate}>{predictions.nextPeriod || '—'}</Text>
                        {daysToNext !== null && daysToNext >= 0 && (
                            <Text style={styles.ovDays}>in {daysToNext}d</Text>
                        )}
                    </View>
                    <View style={[styles.ovItem, styles.ovItemCenter]}>
                        <Text style={styles.ovEmoji}>🥚</Text>
                        <Text style={styles.ovLabel}>Ovulation</Text>
                        <Text style={[styles.ovDate, { color: C.ovulation }]}>{predictions.ovulation || '—'}</Text>
                        {daysToOv !== null && daysToOv >= 0 && (
                            <Text style={styles.ovDays}>in {daysToOv}d</Text>
                        )}
                    </View>
                    <View style={styles.ovItem}>
                        <Text style={styles.ovEmoji}>🌸</Text>
                        <Text style={styles.ovLabel}>Fertile Window</Text>
                        <Text style={styles.ovDate}>
                            {predictions.fertileStart ? `${predictions.fertileStart}` : '—'}
                        </Text>
                        <Text style={[styles.ovDate, { fontSize: 10 }]}>
                            {predictions.fertileEnd ? `→ ${predictions.fertileEnd}` : ''}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    // ─── Intimacy Stats ───────────────────────────────────────────────────────
    const renderIntimacyStats = () => {
        const thisMonth = toDateStr(new Date()).slice(0, 7);
        const thisMonthCount = intimacyLogs.filter(l => l.date.startsWith(thisMonth)).length;
        const lastLog = intimacyLogs.length > 0 ? intimacyLogs[intimacyLogs.length - 1] : null;
        const daysSinceLast = lastLog ? daysBetween(lastLog.date, toDateStr(new Date())) : null;

        return (
            <View style={styles.intimacyStats}>
                <Text style={styles.sectionTitle}>💛 Intimacy Stats</Text>
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statNum}>{thisMonthCount}</Text>
                        <Text style={styles.statLbl}>This Month</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statNum}>{intimacyLogs.length}</Text>
                        <Text style={styles.statLbl}>Total Logged</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statNum}>{daysSinceLast !== null ? `${daysSinceLast}d` : '—'}</Text>
                        <Text style={styles.statLbl}>Last Time</Text>
                    </View>
                </View>
                {lastLog && (
                    <View style={styles.lastIntimacyRow}>
                        <Text style={styles.lastIntimacyText}>
                            Last logged by {lastLog.loggedByName || 'you'} on {lastLog.date}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    // ─── Modal texts ──────────────────────────────────────────────────────────
    const modalConfig = {
        period:         { title: '🩸 Log Period Start',      body: `Mark ${modal.date} as period start?`,    confirm: 'Log It',   danger: false },
        deletePeriod:   { title: 'Remove Period Log',         body: `Delete period log for ${modal.date}?`,   confirm: 'Delete',   danger: true  },
        intimacy:       { title: '💛 Log Intimate Moment',   body: `Mark ${modal.date} as intimate day?`,    confirm: 'Log It',   danger: false },
        deleteIntimacy: { title: 'Remove Intimacy Log',       body: `Delete intimacy log for ${modal.date}?`, confirm: 'Delete',   danger: true  },
    };
    const mc = modal.type ? modalConfig[modal.type] : {};

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={toggleMenu} style={styles.iconBtn}>
                    <Text style={styles.iconTxt}>☰</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Cycle & Intimacy</Text>
                <TouchableOpacity onPress={onNotificationClick} style={styles.iconBtn}>
                    <Text style={styles.iconTxt}>🔔</Text>
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'cycle' && styles.tabActive]}
                    onPress={() => setActiveTab('cycle')}
                >
                    <Text style={[styles.tabTxt, activeTab === 'cycle' && styles.tabTxtActive]}>🩸 Period</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'intimacy' && styles.tabActive]}
                    onPress={() => setActiveTab('intimacy')}
                >
                    <Text style={[styles.tabTxt, activeTab === 'intimacy' && styles.tabTxtActive]}>💛 Intimacy</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <ActivityIndicator color={C.period} style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {/* Calendar */}
                        <View style={styles.calCard}>
                            <Calendar
                                onDayPress={handleDayPress}
                                markedDates={markedDates}
                                markingType="dot"
                                theme={{
                                    backgroundColor: IG.white,
                                    calendarBackground: IG.white,
                                    todayTextColor: C.period,
                                    arrowColor: IG.textPrimary,
                                    selectedDayBackgroundColor: C.period,
                                    dotColor: C.intimacy,
                                    selectedDotColor: IG.white,
                                    dayTextColor: IG.textPrimary,
                                    textDisabledColor: IG.textMuted,
                                    monthTextColor: IG.textPrimary,
                                    textMonthFontWeight: '700',
                                    textDayFontSize: 14,
                                    textMonthFontSize: 16,
                                }}
                            />

                            {/* Legend */}
                            <View style={styles.legend}>
                                {[
                                    { color: C.period,    label: 'Period'    },
                                    { color: C.predicted, label: 'Predicted' },
                                    { color: C.ovulation, label: 'Ovulation' },
                                    { color: C.fertile,   label: 'Fertile'   },
                                    { color: C.intimacy,  label: '💛 Intimate'},
                                ].map(item => (
                                    <View key={item.label} style={styles.legendItem}>
                                        <View style={[styles.dot, { backgroundColor: item.color }]} />
                                        <Text style={styles.legendTxt}>{item.label}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Tab instruction */}
                        <View style={styles.tapHint}>
                            <Text style={styles.tapHintTxt}>
                                {activeTab === 'cycle'
                                    ? '🩸 Tap a date to log period start'
                                    : '💛 Tap a date to mark intimate moment'}
                            </Text>
                        </View>

                        {/* Cycle tab content */}
                        {activeTab === 'cycle' && (
                            <>
                                {renderOvulationCard()}

                                {partnerAdvice ? (
                                    <View style={styles.adviceCard}>
                                        <Text style={styles.sectionTitle}>❤️ Partner Tip</Text>
                                        <Text style={styles.adviceTxt}>{partnerAdvice}</Text>
                                    </View>
                                ) : null}

                                <View style={styles.aiSection}>
                                    <Text style={styles.sectionTitle}>🤖 AI Health Assistant</Text>
                                    <TouchableOpacity
                                        style={styles.aiBtn}
                                        onPress={getAiAdvice}
                                        disabled={aiLoading}
                                    >
                                        {aiLoading
                                            ? <ActivityIndicator color={IG.white} />
                                            : <Text style={styles.aiBtnTxt}>Get Remedy for Cramps</Text>
                                        }
                                    </TouchableOpacity>
                                    {suggestion ? (
                                        <View style={styles.suggestionBox}>
                                            <Text style={styles.suggestionTxt}>{suggestion}</Text>
                                        </View>
                                    ) : null}
                                </View>
                            </>
                        )}

                        {/* Intimacy tab content */}
                        {activeTab === 'intimacy' && renderIntimacyStats()}
                    </>
                )}
            </ScrollView>

            {/* Modal */}
            <Modal
                animationType="slide"
                transparent
                visible={modal.visible}
                onRequestClose={() => setModal({ ...modal, visible: false })}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>{mc.title}</Text>
                        <Text style={styles.modalBody}>{mc.body}</Text>
                        <View style={styles.modalBtns}>
                            <TouchableOpacity
                                style={styles.modalCancel}
                                onPress={() => setModal({ ...modal, visible: false })}
                            >
                                <Text style={styles.modalCancelTxt}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalConfirm, mc.danger && { backgroundColor: IG.red }]}
                                onPress={handleConfirm}
                            >
                                <Text style={styles.modalConfirmTxt}>{mc.confirm}</Text>
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
    headerTitle:{ fontSize: 16, fontWeight: '700', color: IG.textPrimary },
    iconBtn:    { padding: 6 },
    iconTxt:    { fontSize: 22, color: IG.textPrimary },

    // Tabs
    tabs:       { flexDirection: 'row', backgroundColor: IG.white, borderBottomWidth: 0.5, borderBottomColor: IG.border },
    tab:        { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive:  { borderBottomColor: IG.textPrimary },
    tabTxt:     { fontSize: 14, color: IG.textSecondary, fontWeight: '500' },
    tabTxtActive: { color: IG.textPrimary, fontWeight: '700' },

    scroll:     { paddingBottom: 30 },

    // Calendar
    calCard:    { backgroundColor: IG.white, marginTop: 8, borderRadius: 0 },
    legend:     { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 10, marginBottom: 4 },
    dot:        { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
    legendTxt:  { fontSize: 11, color: IG.textSecondary },

    tapHint:    { marginHorizontal: 16, marginTop: 8, marginBottom: 2, paddingVertical: 10, backgroundColor: IG.white, borderRadius: 10, alignItems: 'center', borderWidth: 0.5, borderColor: IG.border },
    tapHintTxt: { fontSize: 13, color: IG.textSecondary },

    // Ovulation card
    ovCard:     { margin: 16, backgroundColor: IG.white, borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: IG.border },
    ovTitle:    { fontSize: 15, fontWeight: '700', color: IG.textPrimary, marginBottom: 14 },
    ovRow:      { flexDirection: 'row', justifyContent: 'space-between' },
    ovItem:     { flex: 1, alignItems: 'center' },
    ovItemCenter:{ borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: IG.border },
    ovEmoji:    { fontSize: 22, marginBottom: 4 },
    ovLabel:    { fontSize: 11, color: IG.textSecondary, textAlign: 'center', marginBottom: 4 },
    ovDate:     { fontSize: 12, fontWeight: '700', color: IG.textPrimary, textAlign: 'center' },
    ovDays:     { fontSize: 11, color: IG.blue, marginTop: 2 },

    // Intimacy stats
    intimacyStats: { margin: 16, backgroundColor: IG.white, borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: IG.border },
    statsRow:   { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
    statBox:    { alignItems: 'center' },
    statNum:    { fontSize: 28, fontWeight: '800', color: C.intimacy },
    statLbl:    { fontSize: 12, color: IG.textSecondary, marginTop: 2 },
    lastIntimacyRow: { marginTop: 14, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: IG.border },
    lastIntimacyText: { fontSize: 13, color: IG.textSecondary, textAlign: 'center' },

    sectionTitle: { fontSize: 16, fontWeight: '700', color: IG.textPrimary, marginBottom: 10 },

    adviceCard: { marginHorizontal: 16, marginTop: 0, backgroundColor: '#FFF5F5', borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: '#FFCDD2' },
    adviceTxt:  { fontSize: 14, color: IG.textPrimary, lineHeight: 20 },

    aiSection:  { margin: 16 },
    aiBtn:      { backgroundColor: IG.textPrimary, borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 12 },
    aiBtnTxt:   { color: IG.white, fontWeight: '600', fontSize: 14 },
    suggestionBox: { backgroundColor: IG.white, borderRadius: 10, padding: 14, borderWidth: 0.5, borderColor: IG.border },
    suggestionTxt: { fontSize: 14, color: IG.textPrimary, lineHeight: 22 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalBox:   { backgroundColor: IG.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: IG.textPrimary, marginBottom: 8 },
    modalBody:  { fontSize: 14, color: IG.textSecondary, marginBottom: 24 },
    modalBtns:  { flexDirection: 'row', gap: 12 },
    modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: IG.border, alignItems: 'center' },
    modalCancelTxt: { fontSize: 14, fontWeight: '600', color: IG.textPrimary },
    modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: IG.textPrimary, alignItems: 'center' },
    modalConfirmTxt: { fontSize: 14, fontWeight: '600', color: IG.white },
});

export default PeriodTrackerScreen;
