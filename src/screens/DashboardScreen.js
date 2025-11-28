import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getTheme } from '../styles/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const DashboardScreen = ({ navigation }) => {
    const { user, partner, logout } = useContext(AuthContext);
    const theme = getTheme(user.color);

    const features = [
        { id: 'Chat', title: 'Chat', icon: '💬', description: 'Stay in touch' },
        { id: 'Posts', title: 'Moments', icon: '📸', description: 'Share memories' },
        { id: 'Dates', title: 'Special Dates', icon: '📅', description: 'Mark your calendar' },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.greeting, { color: theme.text }]}>Hi, {user.name}!</Text>
                    <Text style={styles.subGreeting}>Connected with {partner.name}</Text>
                </View>
                <TouchableOpacity onPress={logout} style={styles.logoutButton}>
                    <Text style={{ color: theme.primary }}>Logout</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.statusCard, { backgroundColor: theme.primary }]}>
                    <Text style={styles.statusTitle}>Together Forever</Text>
                    <Text style={styles.statusText}>
                        You and {partner.name} are connected.
                    </Text>
                </View>

                <Text style={[styles.sectionTitle, { color: theme.text }]}>Explore</Text>

                <View style={styles.grid}>
                    {features.map((feature) => (
                        <TouchableOpacity
                            key={feature.id}
                            style={styles.card}
                            onPress={() => navigation.navigate(feature.id)}
                        >
                            <Text style={styles.cardIcon}>{feature.icon}</Text>
                            <Text style={[styles.cardTitle, { color: theme.text }]}>{feature.title}</Text>
                            <Text style={styles.cardDescription}>{feature.description}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    greeting: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    subGreeting: {
        fontSize: 14,
        color: '#666',
    },
    logoutButton: {
        padding: 10,
    },
    content: {
        padding: 20,
    },
    statusCard: {
        padding: 20,
        borderRadius: 20,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    statusTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    statusText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    grid: {
        flexDirection: 'column',
    },
    card: {
        width: '100%',
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 15,
        marginBottom: 15,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardIcon: {
        fontSize: 32,
        marginRight: 20,
        marginBottom: 0,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    cardDescription: {
        fontSize: 14,
        color: '#999',
    },
});

export default DashboardScreen;
