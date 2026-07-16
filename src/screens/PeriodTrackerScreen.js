import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { getRemedySuggestion, getCyclePredictions, getPartnerAdvice } from '../services/aiService';
import { sendNotification } from '../services/notificationService';

const PeriodTrackerScreen = ({ toggleMenu, onNavigate, onNotificationClick }) => {
    const { user, partner } = useContext(AuthContext);
    const [markedDates, setMarkedDates] = useState({});
    const [loading, setLoading] = useState(true);
    const [suggestion, setSuggestion] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [periodLogs, setPeriodLogs] = useState([]);
    const [predictions, setPredictions] = useState(null);
    const [lastPredictionBaseDate, setLastPredictionBaseDate] = useState(null);
    const [partnerAdvice, setPartnerAdvice] = useState('');

    // Logging Modal State
    // Logging Modal State
    const [logModalVisible, setLogModalVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'delete'
    const [selectedLogId, setSelectedLogId] = useState(null);

    const coupleId = [user.id, partner.id].sort().join('_');

    useEffect(() => {
        const unsub = onSnapshot(query(collection(db, 'periods', coupleId, 'logs'), orderBy('date', 'asc')), (snap) => {
            const logs = snap.docs.map(doc => ({ id: doc.id, date: doc.data().date }));
            setPeriodLogs(logs);
            // Initial render with just logs
            updateCalendar(logs, predictions);
            setLoading(false);
        });

        return () => unsub();
    }, [coupleId]);

    // Fetch Partner Advice
    useEffect(() => {
        if (periodLogs.length > 0) {
            const lastLog = periodLogs[periodLogs.length - 1];
            const lastDate = new Date(lastLog.date);
            const today = new Date();
            const diffTime = today - lastDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

            if (diffDays > 0 && diffDays <= 35) {
                let phase = 'Follicular';
                if (diffDays <= 5) phase = 'Menstrual';
                else if (diffDays >= 12 && diffDays <= 16) phase = 'Ovulation';
                else if (diffDays > 16) phase = 'Luteal';

                getPartnerAdvice(diffDays, phase).then(advice => {
                    if (advice) setPartnerAdvice(advice);
                });
            }
        }
    }, [periodLogs]);

    // Fetch AI Predictions when logs change
    useEffect(() => {
        if (periodLogs.length > 0) {
            const lastLog = periodLogs[periodLogs.length - 1];
            if (lastLog.date !== lastPredictionBaseDate) {
                fetchPredictions(lastLog.date);
            }
        }
    }, [periodLogs]);

    // Update calendar when predictions change
    useEffect(() => {
        updateCalendar(periodLogs, predictions);
    }, [predictions]);

    const fetchPredictions = async (lastDate) => {
        setLastPredictionBaseDate(lastDate);
        const result = await getCyclePredictions(lastDate);
        if (result) {
            setPredictions(result);
        }
    };

    const updateCalendar = (logs, preds) => {
        const marks = {};

        // Mark past periods (5 days duration)
        logs.forEach(l => {
            let start = new Date(l.date);
            for (let i = 0; i < 5; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                marks[dateStr] = { selected: true, selectedColor: '#FF6B6B', type: 'period' };
            }
        });

        // Mark predictions if available
        if (preds) {
            if (preds.nextPeriod) {
                marks[preds.nextPeriod] = { selected: true, selectedColor: '#FFCDD2', type: 'predicted' };
            }
            if (preds.ovulation) {
                marks[preds.ovulation] = { selected: true, selectedColor: '#9C27B0', type: 'ovulation' };
            }
            if (preds.fertileStart && preds.fertileEnd) {
                let start = new Date(preds.fertileStart);
                const end = new Date(preds.fertileEnd);
                while (start <= end) {
                    const dateStr = start.toISOString().split('T')[0];
                    if (!marks[dateStr]) { // Don't overwrite ovulation if it overlaps
                        marks[dateStr] = { selected: true, selectedColor: '#E1BEE7', type: 'fertile' };
                    }
                    start.setDate(start.getDate() + 1);
                }
            }
        }

        setMarkedDates(marks);
    };

    const calculateCycle = (logs) => {
        const marks = {};
        const dates = logs.map(l => l.date);

        // Mark past periods
        dates.forEach(date => {
            marks[date] = { selected: true, selectedColor: '#FF6B6B', type: 'period' };
        });

        // Predict next cycle if we have at least one log
        if (dates.length > 0) {
            const lastPeriod = new Date(dates[dates.length - 1]);

            // Predict next period (approx 28 days)
            const nextPeriod = new Date(lastPeriod);
            nextPeriod.setDate(lastPeriod.getDate() + 28);
            const nextPeriodStr = nextPeriod.toISOString().split('T')[0];
            marks[nextPeriodStr] = { selected: true, selectedColor: '#FFCDD2', type: 'predicted' };

            // Predict Ovulation (approx 14 days before next period)
            const ovulation = new Date(nextPeriod);
            ovulation.setDate(nextPeriod.getDate() - 14);
            const ovulationStr = ovulation.toISOString().split('T')[0];
            marks[ovulationStr] = { selected: true, selectedColor: '#9C27B0', type: 'ovulation' };

            // Fertile Window (Ovulation - 4 days to + 1 day)
            for (let i = -4; i <= 1; i++) {
                if (i === 0) continue; // Skip ovulation day itself (already marked)
                const fertile = new Date(ovulation);
                fertile.setDate(ovulation.getDate() + i);
                const fertileStr = fertile.toISOString().split('T')[0];
                marks[fertileStr] = { selected: true, selectedColor: '#E1BEE7', type: 'fertile' };
            }
        }

        setMarkedDates(marks);
    };

    const logPeriodStart = async (day) => {
        try {
            await addDoc(collection(db, 'periods', coupleId, 'logs'), {
                date: day.dateString,
                userId: user.id,
                createdAt: new Date().toISOString()
            });

            await sendNotification(coupleId, user.id, user.name || 'Partner', `logged period start: ${day.dateString}`, 'period', '🩸');

            setModalVisible(false);
            // Alert.alert("Success", "Period start date logged."); // Removed Alert for better UX
        } catch (error) {
            console.error("Error logging period:", error);
            Alert.alert("Error", "Could not log period.");
        }
    };

    const deletePeriodLog = async (logId) => {
        try {
            await deleteDoc(doc(db, 'periods', coupleId, 'logs', logId));
            Alert.alert("Success", "Period log deleted.");
        } catch (error) {
            console.error("Error deleting period:", error);
            Alert.alert("Error", "Could not delete period log.");
        }
    };

    const handleDayPress = (day) => {
        const date = new Date(day.dateString);

        // Check if this date is ALREADY logged
        const existingLog = periodLogs.find(log => log.date === day.dateString);

        if (existingLog) {
            setSelectedDate(day.dateString);
            setSelectedLogId(existingLog.id);
            setModalMode('delete');
            setLogModalVisible(true);
            return;
        }

        // Check for existing logs within 20 days (Validation)
        const recentLog = periodLogs.find(log => {
            const d = new Date(log.date);
            const diffTime = Math.abs(date - d);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays < 20;
        });

        if (recentLog) {
            Alert.alert(
                "Recent Log Found",
                `You already logged a period start on ${recentLog.date}. Cycles are usually 21+ days. Log anyway?`,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Yes, Log It",
                        onPress: () => {
                            setSelectedDate(day.dateString);
                            setModalMode('add');
                            setLogModalVisible(true);
                        }
                    }
                ]
            );
        } else {
            setSelectedDate(day.dateString);
            setModalMode('add');
            setLogModalVisible(true);
        }
    };

    const handleModalConfirm = () => {
        if (modalMode === 'add' && selectedDate) {
            logPeriodStart({ dateString: selectedDate });
        } else if (modalMode === 'delete' && selectedLogId) {
            deletePeriodLog(selectedLogId);
        }
        setLogModalVisible(false);
    };

    const getAiAdvice = async () => {
        setAiLoading(true);
        const advice = await getRemedySuggestion("period cramps and mood swings");
        setSuggestion(advice);
        setAiLoading(false);
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={toggleMenu} style={styles.backButton}>
                        <Text style={styles.backButtonText}>☰</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Period Tracker</Text>
                    <TouchableOpacity onPress={onNotificationClick} style={styles.backButton}>
                        <Text style={styles.backButtonText}>🔔</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.calendarContainer}>
                    <Calendar
                        onDayPress={handleDayPress}
                        markedDates={markedDates}
                        theme={{
                            todayTextColor: '#FF6B6B',
                            arrowColor: '#FF6B6B',
                            selectedDayBackgroundColor: '#FF6B6B',
                        }}
                    />
                    <View style={styles.legend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: '#FF6B6B' }]} />
                            <Text style={styles.legendText}>Period</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: '#FFCDD2' }]} />
                            <Text style={styles.legendText}>Predicted</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: '#9C27B0' }]} />
                            <Text style={styles.legendText}>Ovulation</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: '#E1BEE7' }]} />
                            <Text style={styles.legendText}>Fertile</Text>
                        </View>
                    </View>
                </View>

                {partnerAdvice ? (
                    <View style={styles.adviceBox}>
                        <Text style={styles.sectionTitle}>❤️ Partner Tip</Text>
                        <Text style={styles.suggestionText}>{partnerAdvice}</Text>
                    </View>
                ) : null}

                <View style={styles.aiSection}>
                    <Text style={styles.sectionTitle}>AI Health Assistant</Text>
                    <Text style={styles.sectionSubtitle}>Get personalized remedy suggestions</Text>

                    <TouchableOpacity style={styles.aiButton} onPress={getAiAdvice} disabled={aiLoading}>
                        {aiLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.aiButtonText}>Get Remedy for Cramps</Text>
                        )}
                    </TouchableOpacity>

                    {suggestion ? (
                        <View style={styles.suggestionBox}>
                            <Text style={styles.suggestionText}>{suggestion}</Text>
                        </View>
                    ) : null}
                </View>


            </ScrollView>

            {/* Log Period Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={logModalVisible}
                onRequestClose={() => setLogModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {modalMode === 'add' ? 'Log Period Start' : 'Delete Period Log'}
                        </Text>
                        <Text style={styles.modalText}>
                            {modalMode === 'add'
                                ? `Mark ${selectedDate} as the start of your period?`
                                : `Delete the period log for ${selectedDate}?`
                            }
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setLogModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveButton, modalMode === 'delete' && { backgroundColor: '#FF4444' }]}
                                onPress={handleModalConfirm}
                            >
                                <Text style={styles.saveButtonText}>
                                    {modalMode === 'add' ? 'Confirm' : 'Delete'}
                                </Text>
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
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 15,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingTop: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        padding: 5,
    },
    backButtonText: {
        fontSize: 24,
        color: '#779ECB',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    calendarContainer: {
        backgroundColor: 'white',
        margin: 15,
        borderRadius: 15,
        padding: 10,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 15,
        paddingBottom: 5,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 5,
    },
    legendText: {
        fontSize: 12,
        color: '#666',
    },
    aiSection: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 15,
    },
    aiButton: {
        backgroundColor: '#779ECB',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 15,
    },
    aiButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    suggestionBox: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E3F2FD',
    },
    suggestionText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    adviceBox: {
        backgroundColor: '#FFF0F5', // Light pink background
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 10,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#FFB7B2',
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
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    modalText: {
        fontSize: 16,
        marginBottom: 20,
        color: '#666',
        textAlign: 'center',
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
        marginRight: 5,
    },
    saveButton: {
        padding: 10,
        backgroundColor: '#FF6B6B',
        borderRadius: 10,
        flex: 1,
        alignItems: 'center',
        marginLeft: 5,
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: 'bold',
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default PeriodTrackerScreen;
