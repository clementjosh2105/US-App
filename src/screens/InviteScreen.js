import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Clipboard, Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getTheme } from '../styles/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const InviteScreen = () => {
    const { user, connectPartner, logout } = useContext(AuthContext);
    const [partnerCode, setPartnerCode] = useState('');
    const theme = getTheme(user.color);

    const copyToClipboard = () => {
        Clipboard.setString(user.inviteCode);
        Alert.alert('Copied', 'Invite code copied to clipboard!');
    };

    const handleConnect = async () => {
        if (!partnerCode.trim()) {
            Alert.alert('Error', 'Please enter a partner code');
            return;
        }
        if (partnerCode === user.inviteCode) {
            Alert.alert('Error', 'You cannot invite yourself!');
            return;
        }

        const cleanCode = partnerCode.trim().toUpperCase();
        const success = await connectPartner(cleanCode);
        if (success) {
            Alert.alert('Success', 'Partner connected!');
        } else {
            Alert.alert('Error', 'Failed to connect. Please try again.');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.content}>
                <Text style={[styles.title, { color: theme.text }]}>Invite your Partner</Text>
                <Text style={styles.description}>
                    Share this code with your partner to connect your accounts.
                </Text>

                <TouchableOpacity style={styles.codeContainer} onPress={copyToClipboard}>
                    <Text style={[styles.code, { color: theme.primary }]}>{user.inviteCode}</Text>
                    <Text style={styles.copyText}>Tap to copy</Text>
                </TouchableOpacity>

                <View style={styles.divider}>
                    <View style={styles.line} />
                    <Text style={styles.orText}>OR</Text>
                    <View style={styles.line} />
                </View>

                <Text style={[styles.label, { color: theme.text }]}>Enter Partner's Code:</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Partner Code"
                    value={partnerCode}
                    onChangeText={setPartnerCode}
                    autoCapitalize="characters"
                />

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.primary }]}
                    onPress={handleConnect}
                >
                    <Text style={styles.buttonText}>Connect</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        color: '#666',
        marginBottom: 30,
    },
    codeContainer: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 15,
        alignItems: 'center',
        marginBottom: 30,
        borderWidth: 2,
        borderColor: '#eee',
        borderStyle: 'dashed',
    },
    code: {
        fontSize: 32,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 5,
    },
    copyText: {
        color: '#999',
        fontSize: 12,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#ccc',
    },
    orText: {
        marginHorizontal: 10,
        color: '#999',
        fontWeight: 'bold',
    },
    label: {
        fontSize: 16,
        marginBottom: 10,
        fontWeight: '600',
    },
    input: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        fontSize: 18,
        textAlign: 'center',
        borderWidth: 1,
        borderColor: '#eee',
    },
    button: {
        padding: 18,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
    logoutButton: {
        alignItems: 'center',
        padding: 10,
    },
    logoutText: {
        color: '#666',
        fontSize: 16,
    },
});

export default InviteScreen;
