import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Vibration } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { db, storage } from '../firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, arrayUnion, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';

const PostsScreen = ({ toggleMenu, onNavigate, onNotificationClick }) => {
    const { user, partner } = useContext(AuthContext);
    const [posts, setPosts] = useState([]);
    const [uploading, setUploading] = useState(false);

    // Draft State
    const [draftImage, setDraftImage] = useState(null);
    const [draftCaption, setDraftCaption] = useState('');

    // Comment State (map of postId -> text)
    const [commentText, setCommentText] = useState({});

    const coupleId = [user.id, partner.id].sort().join('_');

    useEffect(() => {
        const postsRef = collection(db, 'posts', coupleId, 'feed');
        const q = query(postsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const feed = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPosts(feed);
        });

        return () => unsubscribe();
    }, [coupleId]);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setDraftImage(result.assets[0].uri);
        }
    };

    const uploadPost = async () => {
        if (!draftImage) return;
        setUploading(true);
        try {
            const response = await fetch(draftImage);
            const blob = await response.blob();
            const filename = `posts/${coupleId}/${Date.now()}`;
            const storageRef = ref(storage, filename);

            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);

            await addDoc(collection(db, 'posts', coupleId, 'feed'), {
                imageUrl: downloadURL,
                caption: draftCaption,
                comments: [],
                reactions: {},
                senderId: user.id,
                createdAt: serverTimestamp()
            });

            // Trigger Notification
            await addDoc(collection(db, 'notifications', coupleId, 'list'), {
                message: `${user.name} shared a new moment!`,
                icon: '📸',
                createdAt: serverTimestamp(),
                read: false,
                senderId: user.id
            });

            Vibration.vibrate(); // Haptic feedback/Sound replacement

            // Reset Draft
            setDraftImage(null);
            setDraftCaption('');
        } catch (error) {
            console.error("Error uploading post: ", error);
            Alert.alert("Upload failed", error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleComment = async (postId) => {
        const text = commentText[postId];
        if (!text || !text.trim()) return;

        try {
            const postRef = doc(db, 'posts', coupleId, 'feed', postId);
            await updateDoc(postRef, {
                comments: arrayUnion({
                    text: text.trim(),
                    senderId: user.id,
                    createdAt: new Date().toISOString()
                })
            });
            setCommentText(prev => ({ ...prev, [postId]: '' }));
        } catch (error) {
            console.error("Error adding comment:", error);
            Alert.alert("Error", "Could not add comment");
        }
    };

    const handleReaction = async (postId, emoji) => {
        try {
            const postRef = doc(db, 'posts', coupleId, 'feed', postId);
            await updateDoc(postRef, {
                [`reactions.${user.id}`]: emoji
            });
        } catch (error) {
            console.error("Error adding reaction:", error);
        }
    };

    const renderItem = ({ item }) => {
        const isMyPost = item.senderId === user.id;
        const reactions = item.reactions || {};
        const myReaction = reactions[user.id];

        const reactionCounts = Object.values(reactions).reduce((acc, emoji) => {
            if (emoji) acc[emoji] = (acc[emoji] || 0) + 1;
            return acc;
        }, {});

        const REACTION_OPTIONS = ["❤️", "😂", "😮", "😢"];

        return (
            <View style={styles.postContainer}>
                <View style={styles.postHeader}>
                    <Text style={styles.postAuthor}>{isMyPost ? "You" : partner.name}</Text>
                    <Text style={styles.postDate}>
                        {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : ''}
                    </Text>
                </View>
                <Image source={{ uri: item.imageUrl }} style={styles.postImage} />

                <View style={styles.reactionsContainer}>
                    <View style={styles.reactionIcons}>
                        {Object.entries(reactionCounts).map(([emoji, count]) => (
                            <View key={emoji} style={styles.reactionBadge}>
                                <Text style={styles.reactionText}>{emoji} {count}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.reactionPicker}>
                        {REACTION_OPTIONS.map(emoji => (
                            <TouchableOpacity
                                key={emoji}
                                onPress={() => handleReaction(item.id, myReaction === emoji ? null : emoji)}
                                style={[styles.reactionButton, myReaction === emoji && styles.reactionButtonSelected]}
                            >
                                <Text style={styles.reactionButtonText}>{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {item.caption ? (
                    <Text style={styles.caption}>
                        <Text style={styles.captionAuthor}>{isMyPost ? "You" : partner.name}: </Text>
                        {item.caption}
                    </Text>
                ) : null}

                <View style={styles.commentsSection}>
                    {item.comments && item.comments.map((comment, index) => (
                        <Text key={index} style={styles.commentText}>
                            <Text style={styles.commentAuthor}>
                                {comment.senderId === user.id ? "You" : partner.name}:
                            </Text> {comment.text}
                        </Text>
                    ))}

                    <View style={styles.addCommentContainer}>
                        <TextInput
                            style={styles.commentInput}
                            placeholder="Add a comment..."
                            value={commentText[item.id] || ''}
                            onChangeText={(text) => setCommentText(prev => ({ ...prev, [item.id]: text }))}
                        />
                        <TouchableOpacity onPress={() => handleComment(item.id)}>
                            <Text style={styles.postCommentButton}>Post</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    if (draftImage) {
        return (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setDraftImage(null)}>
                        <Text style={styles.uploadButton}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>New Post</Text>
                    <TouchableOpacity onPress={uploadPost} disabled={uploading}>
                        <Text style={[styles.uploadButton, { fontWeight: 'bold' }]}>
                            {uploading ? "Posting..." : "Share"}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.draftContainer}>
                    <Image source={{ uri: draftImage }} style={styles.draftImage} />
                    <TextInput
                        style={styles.captionInput}
                        placeholder="Write a caption..."
                        value={draftCaption}
                        onChangeText={setDraftCaption}
                        multiline
                    />
                </View>
            </KeyboardAvoidingView>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={toggleMenu} style={styles.backButton}>
                    <Text style={styles.backButtonText}>☰</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Shared Moments</Text>
                <TouchableOpacity onPress={onNotificationClick} style={styles.backButton}>
                    <Text style={styles.backButtonText}>🔔</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.actionContainer}>
                <TouchableOpacity onPress={pickImage} disabled={uploading} style={styles.newPostButton}>
                    <Text style={styles.newPostButtonText}>
                        {uploading ? "Uploading..." : "+ New Moment"}
                    </Text>
                </TouchableOpacity>
            </View>

            {uploading && <ActivityIndicator size="large" color={user.color} style={styles.loader} />}

            <FlatList
                data={posts}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No posts yet. Share a memory!</Text>
                }
            />
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    backButton: {
        padding: 5,
    },
    backButtonText: {
        fontSize: 24,
        color: '#779ECB', // Pastel Blue
    },
    uploadButton: {
        fontSize: 16,
        color: '#779ECB', // Pastel Blue
        fontWeight: 'bold',
    },
    actionContainer: {
        padding: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center',
    },
    newPostButton: {
        backgroundColor: '#779ECB', // Pastel Blue
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    newPostButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    loader: {
        marginVertical: 10,
    },
    listContent: {
        padding: 10,
    },
    postContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 15,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    postHeader: {
        padding: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    postAuthor: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    postDate: {
        color: '#999',
        fontSize: 11,
    },
    postImage: {
        width: '100%',
        height: 250, // Reduced height
        resizeMode: 'cover',
    },
    caption: {
        padding: 8,
        fontSize: 14,
        color: '#333',
    },
    captionAuthor: {
        fontWeight: 'bold',
    },
    commentsSection: {
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    commentText: {
        fontSize: 14,
        marginBottom: 5,
        color: '#444',
    },
    commentAuthor: {
        fontWeight: 'bold',
        color: '#000',
    },
    addCommentContainer: {
        flexDirection: 'row',
        marginTop: 10,
        alignItems: 'center',
    },
    commentInput: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        marginRight: 10,
    },
    postCommentButton: {
        color: '#779ECB', // Pastel Blue
        fontWeight: 'bold',
    },
    draftContainer: {
        padding: 20,
    },
    draftImage: {
        width: '100%',
        height: 300,
        borderRadius: 10,
        marginBottom: 20,
    },
    captionInput: {
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    reactionsContainer: {
        padding: 10,
        paddingBottom: 0,
    },
    reactionIcons: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    reactionBadge: {
        backgroundColor: '#f0f0f0',
        borderRadius: 15,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 5,
    },
    reactionText: {
        fontSize: 12,
    },
    reactionPicker: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderTopColor: '#f5f5f5',
        paddingTop: 10,
    },
    reactionButton: {
        padding: 5,
        borderRadius: 20,
    },
    reactionButtonSelected: {
        backgroundColor: '#e6f0ff',
    },
    reactionButtonText: {
        fontSize: 24,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: '#999',
        fontSize: 16,
    },
});

export default PostsScreen;
