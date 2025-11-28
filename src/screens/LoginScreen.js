import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const LoginScreen = () => {
    const [name, setName] = useState('');

    const { login } = useContext(AuthContext);

    const handleLogin = (color) => {
        if (!name.trim()) {
            Alert.alert('Hold up!', 'We need to know your name first.');
            return;
        }
        login(name, color);
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient
                colors={['#FF9A9E', '#FECFEF', '#E0C3FC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.background}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.content}
            >
                <View style={styles.headerContainer}>
                    <Text style={styles.emoji}>💑</Text>
                    <Text style={styles.title}>US</Text>
                    <Text style={styles.subtitle}>Connect deeply, stay close.</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.inputLabel}>What should we call you?</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Your cute nickname..."
                        placeholderTextColor="#aaa"
                        value={name}
                        onChangeText={setName}
                    />

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: '#779ECB', marginRight: 10 }]}
                            onPress={() => handleLogin('blue')}
                        >
                            <Text style={styles.buttonText}>Male ♂️</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: '#FF8080', marginLeft: 10 }]}
                            onPress={() => handleLogin('red')}
                        >
                            <Text style={styles.buttonText}>Female ♀️</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    emoji: {
        fontSize: 60,
        marginBottom: 10,
    },
    title: {
        fontSize: 42,
        fontWeight: '900',
        color: '#fff',
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 5,
    },
    subtitle: {
        fontSize: 18,
        color: '#fff',
        opacity: 0.9,
        marginTop: 5,
        fontWeight: '500',
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 30,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#555',
        marginBottom: 10,
        marginLeft: 5,
    },
    input: {
        backgroundColor: '#f9f9f9',
        padding: 18,
        borderRadius: 20,
        marginBottom: 25,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#eee',
        color: '#333',
    },

    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    button: {
        flex: 1,
        padding: 20,
        borderRadius: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 20,
        letterSpacing: 1,
    },
});

export default LoginScreen;
