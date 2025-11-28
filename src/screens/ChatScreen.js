import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Vibration } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

const ChatScreen = ({ toggleMenu, onNotificationClick }) => {
    const { user, partner } = useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const flatListRef = useRef();

    const coupleId = [user.id, partner.id].sort().join('_');

    useEffect(() => {
        const messagesRef = collection(db, 'chats', coupleId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [coupleId]);

    const sendMessage = async () => {
        if (inputText.trim() === '') return;

        try {
            await addDoc(collection(db, 'chats', coupleId, 'messages'), {
                text: inputText,
                senderId: user.id,
                createdAt: serverTimestamp()
            });

            // Trigger Notification
            await addDoc(collection(db, 'notifications', coupleId, 'list'), {
                message: `New message from ${user.name}`,
                icon: '💬',
                createdAt: serverTimestamp(),
                read: false,
                senderId: user.id
            });

            Vibration.vibrate();
            setInputText('');
        } catch (error) {
            console.error("Error sending message: ", error);
        }
    };

    const renderItem = ({ item }) => {
        const isMyMessage = item.senderId === user.id;
        // Use richer pastels for better white text contrast
        // If user.color is red-ish, use Soft Red (#FF8080). If blue-ish, use Soft Blue (#80B3FF).
        // We check if the stored color is one of our known reds or just default to red/blue logic if possible.
        // Since we can't easily know "red-ish", we'll rely on the stored color BUT we'll override it if it's the very light pastel we just set.

        let bubbleColor = isMyMessage ? user.color : partner.color;

        // Fix for readability: Map light pastels to richer pastels
        const colorMap = {
            '#FFB7B2': '#FF8080', // Light Pink -> Soft Red
            '#AEC6CF': '#779ECB', // Light Blue -> Soft Blue
            'red': '#FF8080',
            'blue': '#779ECB'
        };

        if (colorMap[bubbleColor]) {
            bubbleColor = colorMap[bubbleColor];
        }

        return (
            <View style={[
                styles.messageContainer,
                isMyMessage ? styles.myMessage : styles.partnerMessage,
                { backgroundColor: bubbleColor }
            ]}>
                <Text style={styles.messageText}>{item.text}</Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={toggleMenu} style={styles.backButton}>
                    <Text style={styles.backButtonText}>☰</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chat with {partner.name}</Text>
                <TouchableOpacity onPress={onNotificationClick} style={styles.backButton}>
                    <Text style={styles.backButtonText}>🔔</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Type a message..."
                    placeholderTextColor="#999"
                />
                <TouchableOpacity onPress={sendMessage} style={[styles.sendButton, { backgroundColor: user.color }]}>
                    <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
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
        paddingTop: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: {
        padding: 5,
    },
    backButtonText: {
        fontSize: 24,
        color: '#779ECB', // Pastel Blue
    },
    listContent: {
        padding: 15,
        paddingBottom: 20,
    },
    messageContainer: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 20,
        marginBottom: 10,
    },
    myMessage: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 2,
    },
    partnerMessage: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 2,
    },
    messageText: {
        color: '#0c201dff',
        fontSize: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 10,
        fontSize: 16,
    },
    sendButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    sendButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default ChatScreen;
