import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';

const NotificationPopup = ({ message, icon, visible, onClose }) => {
    const slideAnim = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                speed: 12,
                bounciness: 8,
            }).start();

            // Auto hide after 4 seconds
            const timer = setTimeout(() => {
                hide();
            }, 4000);
            return () => clearTimeout(timer);
        } else {
            hide();
        }
    }, [visible]);

    const hide = () => {
        Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            if (visible && onClose) onClose();
        });
    };

    if (!visible) return null;

    return (
        <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity style={styles.content} onPress={hide}>
                <Text style={styles.icon}>{icon || '🔔'}</Text>
                <Text style={styles.message}>{message}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 50, // Below status bar
        left: 20,
        right: 20,
        zIndex: 1000,
        elevation: 10,
    },
    content: {
        backgroundColor: '#333',
        borderRadius: 25,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    icon: {
        fontSize: 24,
        marginRight: 10,
    },
    message: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
        flex: 1,
    },
});

export default NotificationPopup;
