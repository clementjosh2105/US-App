import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert, ScrollView, Vibration, Animated, Dimensions } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';

const DatesScreen = ({ toggleMenu, onNavigate, onNotificationClick }) => {
    const { user, partner } = useContext(AuthContext);
    const [dates, setDates] = useState([]);

    // Day Details Side Menu State
    const [detailsVisible, setDetailsVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [slideAnim] = useState(new Animated.Value(Dimensions.get('window').width)); // Start off-screen right

    // Form State (inside details menu)
    const [isAdding, setIsAdding] = useState(false);
    const [title, setTitle] = useState('');
    const [emotion, setEmotion] = useState('❤️');

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Month/Year Picker State
    const [pickerVisible, setPickerVisible] = useState(false);
    const [tempYear, setTempYear] = useState(new Date().getFullYear());

    const coupleId = [user.id, partner.id].sort().join('_');
    const EMOTIONS = ['❤️', '🥳', '💍', '🎂', '📅', '🏖️', '🏠', '👶'];
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    useEffect(() => {
        const datesRef = collection(db, 'dates', coupleId, 'events');
        const q = query(datesRef, orderBy('date', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const events = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setDates(events);
        });

        return () => unsubscribe();
    }, [coupleId]);

    const openDetails = (date) => {
        setSelectedDate(date);
        setDetailsVisible(true);
        setIsAdding(false);
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0
        }).start();
    };

    const closeDetails = () => {
        Animated.timing(slideAnim, {
            toValue: Dimensions.get('window').width,
            duration: 300,
            useNativeDriver: true
        }).start(() => setDetailsVisible(false));
    };

    const addDate = async () => {
        if (!title) {
            Alert.alert("Error", "Please enter a title");
            return;
        }

        const dateString = selectedDate.toISOString().split('T')[0];

        try {
            await addDoc(collection(db, 'dates', coupleId, 'events'), {
                title,
                date: dateString,
                emotion,
                createdAt: new Date().toISOString()
            });

            // Trigger Notification
            await addDoc(collection(db, 'notifications', coupleId, 'list'), {
                message: `${user.name} added a date: ${title}`,
                icon: '📅',
                createdAt: new Date(),
                read: false,
                senderId: user.id
            });

            Vibration.vibrate();
            setIsAdding(false);
            setTitle('');
            setEmotion('❤️');
        } catch (error) {
            console.error("Error adding date: ", error);
            Alert.alert("Error", "Could not save date");
        }
    };

    const deleteDate = async (id) => {
        try {
            await deleteDoc(doc(db, 'dates', coupleId, 'events', id));
        } catch (error) {
            console.error("Error deleting date: ", error);
        }
    };

    // Calendar Logic
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    };

    const changeMonth = (increment) => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + increment);
        setCurrentMonth(newDate);
    };

    const changeMonthYear = (monthIndex) => {
        const newDate = new Date(currentMonth);
        newDate.setFullYear(tempYear);
        newDate.setMonth(monthIndex);
        setCurrentMonth(newDate);
        setPickerVisible(false);
    };

    const renderCalendar = () => {
        const { days, firstDay } = getDaysInMonth(currentMonth);
        const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
        const daysArray = Array.from({ length: days }, (_, i) => i + 1);
        const blanks = Array.from({ length: firstDay }, (_, i) => i);

        return (
            <View style={styles.calendarContainer}>
                <View style={styles.calendarHeader}>
                    <TouchableOpacity onPress={() => changeMonth(-1)}><Text style={styles.arrow}>◀</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                        setTempYear(currentMonth.getFullYear());
                        setPickerVisible(true);
                    }}>
                        <Text style={styles.monthTitle}>{monthName} ▾</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => changeMonth(1)}><Text style={styles.arrow}>▶</Text></TouchableOpacity>
                </View>
                <View style={styles.weekDays}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <Text key={i} style={styles.weekDay}>{d}</Text>
                    ))}
                </View>
                <View style={styles.daysGrid}>
                    {blanks.map((_, i) => <View key={`blank-${i}`} style={styles.dayCell} />)}
                    {daysArray.map(day => {
                        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const hasEvent = dates.find(d => d.date === dateStr);
                        const isSelected = selectedDate.toISOString().split('T')[0] === dateStr;

                        return (
                            <TouchableOpacity
                                key={day}
                                style={[styles.dayCell, isSelected && styles.selectedDay]}
                                onPress={() => {
                                    const newDate = new Date(currentMonth);
                                    newDate.setDate(day);
                                    openDetails(newDate);
                                }}
                            >
                                <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>{day}</Text>
                                {hasEvent && <Text style={styles.eventDot}>{hasEvent.emotion}</Text>}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    // Filter events for selected date
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    const selectedEvents = dates.filter(d => d.date === selectedDateStr);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={toggleMenu} style={styles.backButton}>
                    <Text style={styles.backButtonText}>☰</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Dates to Remember</Text>
                <TouchableOpacity onPress={onNotificationClick} style={styles.backButton}>
                    <Text style={styles.backButtonText}>🔔</Text>
                </TouchableOpacity>
            </View>



            <ScrollView style={styles.content}>
                {renderCalendar()}
                <Text style={styles.listHeader}>Upcoming Events</Text>
                {dates.map(item => (
                    <View key={item.id} style={styles.dateContainer}>
                        <View style={styles.dateInfo}>
                            <Text style={styles.dateEmotion}>{item.emotion}</Text>
                            <View>
                                <Text style={styles.dateTitle}>{item.title}</Text>
                                <Text style={styles.dateValue}>{item.date}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => deleteDate(item.id)}>
                            <Text style={styles.deleteText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>

            {/* Side Menu / Details Panel */}
            {detailsVisible && (
                <View style={styles.overlay}>
                    <TouchableOpacity style={styles.backdrop} onPress={closeDetails} />
                    <Animated.View style={[styles.sideMenu, { transform: [{ translateX: slideAnim }] }]}>
                        <View style={styles.sideMenuHeader}>
                            <Text style={styles.sideMenuTitle}>{selectedDate.toDateString()}</Text>
                            <TouchableOpacity onPress={closeDetails}>
                                <Text style={styles.closeText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.sideMenuContent}>
                            {selectedEvents.length > 0 ? (
                                selectedEvents.map(event => (
                                    <View key={event.id} style={styles.eventCard}>
                                        <Text style={styles.eventEmotion}>{event.emotion}</Text>
                                        <Text style={styles.eventTitle}>{event.title}</Text>
                                        <TouchableOpacity onPress={() => deleteDate(event.id)}>
                                            <Text style={styles.deleteText}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.noEventsText}>No events for this day.</Text>
                            )}

                            {!isAdding ? (
                                <TouchableOpacity style={styles.addButton} onPress={() => setIsAdding(true)}>
                                    <Text style={styles.addButtonText}>+ Add Event</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.addForm}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Event Title"
                                        value={title}
                                        onChangeText={setTitle}
                                    />
                                    <View style={styles.emotionPicker}>
                                        {EMOTIONS.map(e => (
                                            <TouchableOpacity
                                                key={e}
                                                onPress={() => setEmotion(e)}
                                                style={[styles.emotionButton, emotion === e && styles.emotionSelected]}
                                            >
                                                <Text style={styles.emotionText}>{e}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <View style={styles.formButtons}>
                                        <TouchableOpacity onPress={() => setIsAdding(false)} style={styles.cancelButton}>
                                            <Text style={styles.cancelButtonText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={addDate} style={styles.saveButton}>
                                            <Text style={styles.saveButtonText}>Save</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </ScrollView>
                    </Animated.View>
                </View>
            )}

            {/* Month/Year Picker Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={pickerVisible}
                onRequestClose={() => setPickerVisible(false)}
            >
                <View style={styles.pickerModalOverlay}>
                    <View style={styles.pickerModalContent}>
                        <View style={styles.yearSelector}>
                            <TouchableOpacity onPress={() => setTempYear(tempYear - 1)}>
                                <Text style={styles.arrow}>◀</Text>
                            </TouchableOpacity>
                            <Text style={styles.yearText}>{tempYear}</Text>
                            <TouchableOpacity onPress={() => setTempYear(tempYear + 1)}>
                                <Text style={styles.arrow}>▶</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.monthsGrid}>
                            {months.map((m, i) => (
                                <TouchableOpacity
                                    key={m}
                                    style={styles.monthButton}
                                    onPress={() => changeMonthYear(i)}
                                >
                                    <Text style={styles.monthButtonText}>{m.slice(0, 3)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity
                            style={styles.closePickerButton}
                            onPress={() => setPickerVisible(false)}
                        >
                            <Text style={styles.closePickerText}>Cancel</Text>
                        </TouchableOpacity>
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
    backButtonText: { fontSize: 24, color: '#779ECB' },
    monthTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#779ECB',
    },
    arrow: {
        fontSize: 20,
        padding: 10,
        color: '#779ECB',
    },
    selectedDay: {
        backgroundColor: '#779ECB',
        borderRadius: 20,
    },
    addButton: {
        backgroundColor: '#779ECB',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
    },
    emotionSelected: {
        backgroundColor: '#E3F2FD', // Light pastel blue bg
        borderWidth: 1,
        borderColor: '#779ECB',
    },
    saveButton: {
        backgroundColor: '#779ECB',
        padding: 10,
        borderRadius: 5,
        paddingHorizontal: 20,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },

    // Picker Modal Styles
    pickerModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerModalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        width: '80%',
        alignItems: 'center',
    },
    yearSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    yearText: {
        fontSize: 24,
        fontWeight: 'bold',
        marginHorizontal: 20,
    },
    monthsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    monthButton: {
        width: '30%',
        padding: 10,
        margin: 1.5,
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        alignItems: 'center',
    },
    monthButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    closePickerButton: {
        marginTop: 20,
        padding: 10,
    },
    closePickerText: {
        color: '#ff4444',
        fontSize: 16,
    },
});

export default DatesScreen;
