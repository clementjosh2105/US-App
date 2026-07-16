import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Vibration, Image } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, doc, where, getDocs, writeBatch } from 'firebase/firestore';
import { sendNotification } from '../services/notificationService';

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

            // Mark unread messages from partner as read
            const unreadBatches = [];
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.senderId !== user.id && !data.read) {
                    unreadBatches.push(doc.ref);
                }
            });

            if (unreadBatches.length > 0) {
                const batch = writeBatch(db);
                unreadBatches.forEach(ref => {
                    batch.update(ref, { read: true });
                });
                batch.commit().catch(err => console.error("Error marking read:", err));
            }
        });

        return () => unsubscribe();
    }, [coupleId]);

    const sendMessage = async () => {
        const textToSend = inputText.trim();
        if (textToSend === '') return;

        // Optimistic update: Clear input immediately
        setInputText('');
        Vibration.vibrate();

        try {
            await addDoc(collection(db, 'chats', coupleId, 'messages'), {
                text: textToSend,
                senderId: user.id,
                read: false,
                createdAt: serverTimestamp()
            });

            // Trigger Notification
            await sendNotification(coupleId, user.id, user.name, `New message from ${user.name}`, 'chat', '💬');
        } catch (error) {
            console.error("Error sending message: ", error);
            // Optional: Restore input if failed, but for now just logging is fine
        }
    };

    const renderItem = ({ item, index }) => {
        const isMyMessage = item.senderId === user.id;
        const prevMessage = messages[index - 1];
        const isSameSender = prevMessage && prevMessage.senderId === item.senderId;

        // Only show avatar for partner, and only if it's the first message in a sequence (or we can do last, but first is standard for "header" style, or last for "footer" style. Let's do last for "footer" style as it looks cleaner with the bubble tail).
        // Actually, standard modern chat (like Messenger/WhatsApp) shows avatar at the BOTTOM of the group.
        const nextMessage = messages[index + 1];
        const isLastInGroup = !nextMessage || nextMessage.senderId !== item.senderId;

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

        const photoUrl = isMyMessage ? user.photoUrl : partner.photoUrl;
        const name = isMyMessage ? user.name : partner.name;

        return (
            <View style={[
                styles.messageRow,
                isMyMessage ? styles.myRow : styles.partnerRow,
                { marginBottom: isLastInGroup ? 10 : 2 } // Tighter spacing for grouped messages
            ]}>
                {!isMyMessage && (
                    <View style={styles.avatarContainer}>
                        {isLastInGroup ? (
                            photoUrl ?
                                <Image
                                    source={{ uri: photoUrl, cache: 'force-cache' }}
                                    style={styles.avatar}
                                /> :
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <Text style={styles.avatarText}>{name ? name[0] : '?'}</Text>
                                </View>
                        ) : (
                            <View style={styles.avatarSpacer} />
                        )}
                    </View>
                )}

                <View style={[
                    styles.messageContainer,
                    isMyMessage ? styles.myMessage : styles.partnerMessage,
                    {
                        backgroundColor: bubbleColor,
                        borderBottomLeftRadius: (!isMyMessage && isLastInGroup) ? 4 : 18,
                        borderBottomRightRadius: (isMyMessage && isLastInGroup) ? 4 : 18,
                        borderTopLeftRadius: (!isMyMessage && !isSameSender) ? 18 : (!isMyMessage ? 4 : 18),
                        borderTopRightRadius: (isMyMessage && !isSameSender) ? 18 : (isMyMessage ? 4 : 18),
                    }
                ]}>
                    <Text style={styles.messageText}>{item.text}</Text>
                    {isMyMessage && (
                        <Text style={styles.readStatus}>
                            {item.read ? '✓✓' : '✓'}
                        </Text>
                    )}
                </View>
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
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>{partner.name}</Text>
                    {/* Could add "Active now" or status here later */}
                </View>
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

            <View style={styles.inputWrapper}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Message..."
                        placeholderTextColor="#999"
                        multiline
                    />
                    <TouchableOpacity onPress={sendMessage} style={[styles.sendButton, { backgroundColor: user.color }]}>
                        <Text style={styles.sendButtonText}>➤</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff', // Cleaner white background
    },
    header: {
        padding: 15,
        backgroundColor: '#fff',
        paddingTop: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        // Removed border for cleaner look
        zIndex: 10,
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    backButton: {
        padding: 10,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        fontSize: 20,
        color: '#333',
    },
    listContent: {
        paddingHorizontal: 15,
        paddingBottom: 20,
        paddingTop: 10,
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    myRow: {
        justifyContent: 'flex-end',
    },
    partnerRow: {
        justifyContent: 'flex-start',
    },
    avatarContainer: {
        width: 34,
        marginRight: 8,
    },
    avatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#ddd',
    },
    avatarPlaceholder: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ccc',
    },
    avatarSpacer: {
        width: 34,
        height: 34,
    },
    avatarText: {
        fontSize: 14,
        color: 'white',
        fontWeight: 'bold',
    },
    messageContainer: {
        maxWidth: '75%',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 18,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    myMessage: {
        alignSelf: 'flex-end',
    },
    partnerMessage: {
        alignSelf: 'flex-start',
    },
    messageText: {
        color: '#0c201dff',
        fontSize: 16,
        lineHeight: 22,
    },
    readStatus: {
        fontSize: 11,
        color: 'rgba(0, 0, 0, 0.4)',
        alignSelf: 'flex-end',
        marginTop: 2,
        marginRight: -4, // Pull it slightly right
    },
    inputWrapper: {
        padding: 15,
        backgroundColor: '#fff',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 5,
        backgroundColor: '#f8f9fa',
        borderRadius: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    input: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 10,
        fontSize: 16,
        maxHeight: 100,
        color: '#333',
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 5,
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 2, // Optical adjustment for arrow
    },
});

export default ChatScreen;
