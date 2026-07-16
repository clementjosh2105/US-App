import React, { useState, useContext } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    Alert, KeyboardAvoidingView, Platform, Dimensions, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from '../context/AuthContext';
import { IG } from '../styles/theme';

const { width, height } = Dimensions.get('window');

// Instagram-style gradient colors
const IG_GRADIENT = ['#833AB4', '#FD1D1D', '#FCB045'];

const LoginScreen = () => {
    const [name, setName] = useState('');
    const { login } = useContext(AuthContext);

    const handleLogin = (color) => {
        if (!name.trim()) {
            Alert.alert('Hold up!', 'We need to know your name first 💭');
            return;
        }
        login(name, color);
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Gradient background */}
            <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.bg} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inner}
            >
                {/* Logo area */}
                <View style={styles.logoArea}>
                    <LinearGradient
                        colors={IG_GRADIENT}
                        style={styles.logoRing}
                        start={{ x: 0, y: 1 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <View style={styles.logoInner}>
                            <Text style={styles.logoEmoji}>💑</Text>
                        </View>
                    </LinearGradient>

                    <Text style={styles.appName}>US</Text>
                    <Text style={styles.tagline}>your private couple space</Text>
                </View>

                {/* Card */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>What should we call you?</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Your nickname..."
                            placeholderTextColor={IG.textMuted}
                            value={name}
                            onChangeText={setName}
                            autoCorrect={false}
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.maleBtn}
                        onPress={() => handleLogin('blue')}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={['#4facfe', '#00f2fe']}
                            style={styles.btnGrad}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.btnTxt}>♂  Continue as Male</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.femaleBtn}
                        onPress={() => handleLogin('red')}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={IG_GRADIENT}
                            style={styles.btnGrad}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.btnTxt}>♀  Continue as Female</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <Text style={styles.footer}>Just the two of you ❤️</Text>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container:  { flex: 1 },
    bg:         { position: 'absolute', inset: 0 },
    inner:      { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },

    // Logo
    logoArea:   { alignItems: 'center', marginBottom: 36 },
    logoRing:   { width: 90, height: 90, borderRadius: 22, padding: 3, marginBottom: 18 },
    logoInner:  { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    logoEmoji:  { fontSize: 40 },
    appName:    { fontSize: 42, fontWeight: '800', color: '#fff', letterSpacing: 4, fontStyle: 'italic' },
    tagline:    { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 4, letterSpacing: 1 },

    // Card
    card:       { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: 24, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)' },
    cardLabel:  { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 12, fontWeight: '500' },
    inputWrapper: { marginBottom: 20 },
    input:      { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 14, fontSize: 16, color: '#fff', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)' },

    maleBtn:    { borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
    femaleBtn:  { borderRadius: 12, overflow: 'hidden' },
    btnGrad:    { paddingVertical: 16, alignItems: 'center' },
    btnTxt:     { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

    footer:     { textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 28 },
});

export default LoginScreen;
