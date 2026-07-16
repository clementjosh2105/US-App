import React, { useContext, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { setupNotifications } from '../services/notificationService';

// Screens
import LoginScreen from '../screens/LoginScreen';
import InviteScreen from '../screens/InviteScreen';
import HomeScreen from '../screens/HomeScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
    const { user, partner, isLoading } = useContext(AuthContext);

    useEffect(() => {
        setupNotifications().catch(err => console.log("Failed to setup notifications:", err));
    }, []);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!user ? (
                    // Auth Stack
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : !partner ? (
                    // Invite Stack (User logged in but no partner)
                    <Stack.Screen name="Invite" component={InviteScreen} />
                ) : (
                    // Main App Stack (Connected)
                    <Stack.Screen name="Home" component={HomeScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
