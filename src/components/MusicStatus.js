import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, TextInput, Alert, Linking } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { doc, onSnapshot, setDoc, serverTimestamp, addDoc, collection, updateDoc } from 'firebase/firestore';
import { sendNotification } from '../services/notificationService';

const MusicStatus = () => {
    const { user, partner } = useContext(AuthContext);
    const [myStatus, setMyStatus] = useState(null);
    const [partnerStatus, setPartnerStatus] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    // Form State
    const [statusText, setStatusText] = useState('');
    const [songName, setSongName] = useState('');
    const [songLink, setSongLink] = useState('');

    const coupleId = [user.id, partner.id].sort().join('_');

    useEffect(() => {
        // Listen to My Status
        const myUnsub = onSnapshot(doc(db, 'status', coupleId, 'current', user.id), (doc) => {
            if (doc.exists()) setMyStatus(doc.data());
        });

        // Listen to Partner Status
        const partnerUnsub = onSnapshot(doc(db, 'status', coupleId, 'current', partner.id), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setPartnerStatus(data);

                // Mark as seen if not already seen
                if (!data.seen) {
                    updateDoc(docSnap.ref, { seen: true });
                }
            }
        });

        return () => {
            myUnsub();
            partnerUnsub();
        };
    }, [coupleId]);

    const handleSaveStatus = async () => {
        try {
            await setDoc(doc(db, 'status', coupleId, 'current', user.id), {
                text: statusText,
                song: songName,
                link: songLink,
                updatedAt: serverTimestamp(),
                userId: user.id,
                seen: false
            });

            await sendNotification(coupleId, user.id, user.name, `updated status: ${statusText}`, 'music', '🎵');

            setModalVisible(false);
            setStatusText('');
            setSongName('');
            setSongLink('');
        } catch (error) {
            Alert.alert("Error", "Could not update status");
        }
    };

    const openSpotify = (link) => {
        if (link) {
            Linking.openURL(link).catch(() => Alert.alert("Error", "Could not open link"));
        } else {
            // Fallback search
            const query = encodeURIComponent(partnerStatus?.song || "");
            Linking.openURL(`https://open.spotify.com/search/${query}`);
        }
    };

    const renderBubble = (isMe, status, name, photoUrl) => (
        <TouchableOpacity
            style={styles.bubbleContainer}
            onPress={() => isMe ? setModalVisible(true) : (status?.song && openSpotify(status.link))}
        >
            <View style={[styles.avatarRing, isMe ? styles.myRing : styles.partnerRing]}>
                {photoUrl ? (
                    <Image
                        source={{ uri: photoUrl, cache: 'force-cache' }}
                        style={styles.avatarImage}
                    />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{name ? name[0] : '?'}</Text>
                    </View>
                )}
                {status?.song && (
                    <View style={styles.musicBadge}>
                        <Text style={{ fontSize: 10 }}>🎵</Text>
                    </View>
                )}
                {isMe && status?.seen && (
                    <View style={styles.seenBadge}>
                        <Text style={{ fontSize: 10 }}>👁️</Text>
                    </View>
                )}
            </View>

            {status ? (
                <View style={styles.statusBubble}>
                    <Text style={styles.statusText} numberOfLines={1}>{status.text}</Text>
                    {status.song && <Text style={styles.songText} numberOfLines={1}>🎵 {status.song}</Text>}
                </View>
            ) : (
                isMe && <Text style={styles.addStatusText}>+ Share Status</Text>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {renderBubble(true, myStatus, user.name, user.photoUrl)}

            <View style={styles.connector} />

            {renderBubble(false, partnerStatus, partner.name, partner.photoUrl)}

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Status</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="What's on your mind?"
                            value={statusText}
                            onChangeText={setStatusText}
                        />

                        <Text style={styles.label}>Listening to (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Song Name"
                            value={songName}
                            onChangeText={setSongName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Spotify Link"
                            value={songLink}
                            onChangeText={setSongLink}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveButton} onPress={handleSaveStatus}>
                                <Text style={styles.saveButtonText}>Share</Text>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    connector: {
        width: 40,
        height: 2,
        backgroundColor: '#f0f0f0',
        marginHorizontal: 10,
    },
    bubbleContainer: {
        alignItems: 'center',
        maxWidth: 120,
    },
    avatarRing: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    myRing: {
        borderColor: '#FFB7B2',
    },
    partnerRing: {
        borderColor: '#AEC6CF',
    },
    avatarImage: {
        width: 54,
        height: 54,
        borderRadius: 27,
    },
    avatarPlaceholder: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 24,
        color: '#999',
        fontWeight: 'bold',
    },
    statusBubble: {
        backgroundColor: '#f8f9fa',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 15,
        alignItems: 'center',
        width: '100%',
    },
    statusText: {
        fontSize: 12,
        color: '#333',
        fontWeight: '500',
        textAlign: 'center',
    },
    songText: {
        fontSize: 10,
        color: '#1DB954', // Spotify Green
        marginTop: 2,
    },
    addStatusText: {
        fontSize: 12,
        color: '#999',
        marginTop: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#f5f5f5',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    cancelButton: {
        padding: 15,
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: '#FF6B6B',
        padding: 15,
        borderRadius: 10,
        flex: 1,
        marginLeft: 10,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: 'bold',
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    musicBadge: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        backgroundColor: '#fff',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    seenBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#fff',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
});

export default MusicStatus;
