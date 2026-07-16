import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { IG } from '../styles/theme';

const NotificationPopup = ({ message, icon, visible, onClose, onPress }) => {
    const slideAnim = useRef(new Animated.Value(-120)).current;
    const closedRef = useRef(false);

    useEffect(() => {
        if (visible) {
            closedRef.current = false;
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                speed: 14,
                bounciness: 6,
            }).start();

            // Auto-dismiss after 4 s
            const timer = setTimeout(() => dismiss(), 4000);
            return () => clearTimeout(timer);
        }
    }, [visible]);

    const dismiss = () => {
        if (closedRef.current) return;
        closedRef.current = true;
        Animated.timing(slideAnim, {
            toValue: -120,
            duration: 260,
            useNativeDriver: true,
        }).start(() => {
            if (onClose) onClose();
        });
    };

    const handlePress = () => {
        if (onPress) onPress();
        dismiss();
    };

    if (!visible) return null;

    return (
        <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity style={styles.content} onPress={handlePress} activeOpacity={0.9}>
                <Text style={styles.icon}>{icon || '🔔'}</Text>
                <Text style={styles.message} numberOfLines={2}>{message}</Text>
                <TouchableOpacity onPress={dismiss} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 52,
        left: 12,
        right: 12,
        zIndex: 9999,
        elevation: 20,
    },
    content: {
        backgroundColor: '#1C1C1E',
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
    },
    icon: {
        fontSize: 22,
        marginRight: 10,
    },
    message: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 13,
        flex: 1,
        lineHeight: 18,
    },
    closeBtn: {
        marginLeft: 10,
        padding: 2,
    },
    closeIcon: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '700',
    },
});

export default NotificationPopup;
