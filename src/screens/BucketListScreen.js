import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebaseConfig';
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';

const BucketListScreen = ({ toggleMenu, onNotificationClick }) => {
    const { user, partner } = useContext(AuthContext);
    const [newItem, setNewItem] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const coupleId = [user.id, partner.id].sort().join('_');

    useEffect(() => {
        const q = query(collection(db, 'bucketlist', coupleId, 'items'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setItems(list);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [coupleId]);

    const handleAddItem = async () => {
        if (!newItem.trim()) return;

        try {
            await addDoc(collection(db, 'bucketlist', coupleId, 'items'), {
                text: newItem.trim(),
                completed: false,
                createdBy: user.id,
                createdAt: serverTimestamp()
            });
            setNewItem('');
        } catch (error) {
            Alert.alert("Error", "Could not add item");
        }
    };

    const toggleComplete = async (item) => {
        try {
            await updateDoc(doc(db, 'bucketlist', coupleId, 'items', item.id), {
                completed: !item.completed
            });
        } catch (error) {
            console.error("Error toggling item:", error);
        }
    };

    const deleteItem = async (id) => {
        Alert.alert(
            "Delete Item",
            "Are you sure you want to remove this from your list?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'bucketlist', coupleId, 'items', id));
                        } catch (error) {
                            Alert.alert("Error", "Could not delete item");
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }) => (
        <View style={styles.itemContainer}>
            <TouchableOpacity
                style={[styles.checkbox, item.completed && styles.checkedCheckbox]}
                onPress={() => toggleComplete(item)}
            >
                {item.completed && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <Text style={[styles.itemText, item.completed && styles.completedText]}>
                {item.text}
            </Text>

            <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteButton}>
                <Text style={styles.deleteText}>🗑️</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={toggleMenu} style={styles.backButton}>
                    <Text style={styles.backButtonText}>☰</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bucket List</Text>
                <TouchableOpacity onPress={onNotificationClick} style={styles.backButton}>
                    <Text style={styles.backButtonText}>🔔</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Add a new dream..."
                    value={newItem}
                    onChangeText={setNewItem}
                />
                <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
                    <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#FF6B6B" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={items}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No dreams yet! Start adding some.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    backButton: {
        padding: 10,
    },
    backButtonText: {
        fontSize: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 20,
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 15,
        borderRadius: 25,
        marginRight: 10,
        fontSize: 16,
    },
    addButton: {
        backgroundColor: '#FF6B6B',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 25,
    },
    addButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    list: {
        padding: 20,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 15,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#FF6B6B',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    checkedCheckbox: {
        backgroundColor: '#FF6B6B',
    },
    checkmark: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    itemText: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    completedText: {
        textDecorationLine: 'line-through',
        color: '#aaa',
    },
    deleteButton: {
        padding: 5,
    },
    deleteText: {
        fontSize: 18,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        color: '#999',
        fontSize: 16,
    },
});

export default BucketListScreen;
