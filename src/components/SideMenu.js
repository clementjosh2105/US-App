import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getTheme } from '../styles/theme';

const SideMenu = ({ isOpen, onClose, onNavigate, activeTab }) => {
    const { user, logout } = useContext(AuthContext);
    const theme = getTheme(user.color);

    if (!isOpen) return null;

    const menuItems = [
        { id: 'Dashboard', icon: '🏆', label: 'Dashboard' },
        { id: 'Posts', icon: '📸', label: 'Moments' },
        { id: 'Chat', icon: '💬', label: 'Chat' },
        { id: 'Dates', icon: '📅', label: 'Dates' },
    ];

    return (
        <View style={styles.overlay}>
            <TouchableOpacity style={styles.backdrop} onPress={onClose} />
            <View style={[styles.menu, { backgroundColor: 'white' }]}>
                <View style={[styles.header, { backgroundColor: theme.primary }]}>
                    <Text style={styles.headerTitle}>Couple App</Text>
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

                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
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
    logoutText: {
        color: '#ff4444',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default SideMenu;
