import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Image, Alert, Modal, ActivityIndicator } from 'react-native';
import React, { useContext, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { getTheme } from '../styles/theme';

const SideMenu = ({ isOpen, onClose, onNavigate, activeTab }) => {
    const { user, logout, updateProfilePhoto } = useContext(AuthContext);
    const theme = getTheme(user.color);
    const [isUploading, setIsUploading] = useState(false);

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'We need access to your photos to update your profile picture.');
            return;
        }

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.5,
                maxWidth: 800,
                maxHeight: 800,
            });

            if (!result.canceled) {
                setIsUploading(true);
                await updateProfilePhoto(result.assets[0].uri);
                setIsUploading(false);
                Alert.alert("Success", "Profile photo updated!");
            }
        } catch (error) {
            setIsUploading(false);
            Alert.alert("Error", "Could not update profile photo.");
        }
    };

    if (!isOpen) return null;

    const menuItems = [
        { id: 'Score', icon: '🏆', label: 'Our Bond' },
        { id: 'Posts', icon: '📸', label: 'Posts' },
        { id: 'Chat', icon: '💬', label: 'Chat' },
        { id: 'Dates', icon: '📅', label: 'Dates' },
        { id: 'PeriodTracker', icon: '🩸', label: 'Period Tracker' },
        { id: 'BucketList', icon: '📝', label: 'Bucket List' },
    ];

    return (
        <View style={styles.overlay}>
            <TouchableOpacity style={styles.backdrop} onPress={onClose} />
            <View style={[styles.menu, { backgroundColor: 'white' }]}>
                <View style={[styles.header, { backgroundColor: theme.primary }]}>
                    <TouchableOpacity onPress={handlePickImage} style={styles.avatarContainer}>
                        {user.photoUrl ? (
                            <Image
                                source={{ uri: user.photoUrl, cache: 'force-cache' }}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                <Text style={styles.avatarText}>{user.name ? user.name[0].toUpperCase() : '?'}</Text>
                            </View>
                        )}
                        <View style={styles.editBadge}>
                            <Text style={styles.editBadgeText}>✏️</Text>
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>US &lt;3</Text>
                    <Text style={styles.headerSubtitle}>Hi, {user.name}</Text>
                </View>

                <View style={styles.items}>
                    {menuItems.map(item => (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.item,
                                activeTab === item.id && { backgroundColor: '#f0f0f0', borderLeftWidth: 4, borderLeftColor: theme.primary }
                            ]}
                            onPress={() => {
                                onNavigate(item.id);
                                onClose();
                            }}
                        >
                            <Text style={styles.itemIcon}>{item.icon}</Text>
                            <Text style={[styles.itemLabel, activeTab === item.id && { color: theme.primary, fontWeight: 'bold' }]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={() => {
                        onNavigate('Settings');
                        onClose();
                    }}
                >
                    <Text style={styles.settingsText}>⚙️ Settings</Text>
                </TouchableOpacity>
            </View>

            <Modal transparent={true} visible={isUploading} animationType="fade">
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={styles.loadingText}>Updating Profile...</Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        flexDirection: 'row',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    menu: {
        width: '70%',
        height: '100%',
        backgroundColor: 'white',
        shadowColor: "#000",
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    header: {
        padding: 20,
        paddingTop: 50,
        marginBottom: 20,
    },
    headerTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginTop: 5,
    },
    loadingOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        elevation: 5,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#555',
    },
    avatarContainer: {
        marginBottom: 15,
        position: 'relative',
        alignSelf: 'flex-start',
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 3,
        borderColor: 'white',
    },
    avatarPlaceholder: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 3,
        borderColor: 'white',
    },
    avatarText: {
        fontSize: 30,
        color: 'white',
        fontWeight: 'bold',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: 'white',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    editBadgeText: {
        fontSize: 12,
    },
    items: {
        flex: 1,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        paddingLeft: 20,
    },
    itemIcon: {
        fontSize: 24,
        marginRight: 15,
    },
    itemLabel: {
        fontSize: 16,
        color: '#333',
    },
    logoutButton: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    settingsText: {
        color: '#666',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default SideMenu;
