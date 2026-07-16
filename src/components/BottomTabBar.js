import React from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IG } from '../styles/theme';

const TABS = [
    { id: 'Score',         icon: '🏠', label: 'Home'     },
    { id: 'Posts',         icon: '📸', label: 'Moments'  },
    { id: 'Chat',          icon: '💬', label: 'Chat'     },
    { id: 'PeriodTracker', icon: '🩸', label: 'Cycle'    },
    { id: 'Dates',         icon: '🗓', label: 'Dates'    },
];

const BottomTabBar = ({ activeTab, onNavigate }) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <TouchableOpacity
                        key={tab.id}
                        style={styles.tab}
                        onPress={() => onNavigate(tab.id)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.icon, isActive && styles.iconActive]}>
                            {tab.icon}
                        </Text>
                        <Text style={[styles.label, isActive && styles.labelActive]}>
                            {tab.label}
                        </Text>
                        {isActive && <View style={styles.activeLine} />}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container:  {
        flexDirection: 'row',
        backgroundColor: IG.white,
        borderTopWidth: 0.5,
        borderTopColor: IG.border,
        paddingTop: 8,
        paddingHorizontal: 4,
    },
    tab:        { flex: 1, alignItems: 'center', paddingBottom: 4, position: 'relative' },
    icon:       { fontSize: 22, opacity: 0.4, marginBottom: 2 },
    iconActive: { opacity: 1 },
    label:      { fontSize: 10, color: IG.textSecondary, fontWeight: '400' },
    labelActive: { color: IG.textPrimary, fontWeight: '700' },
    activeLine: {
        position: 'absolute',
        top: -8,
        width: 24,
        height: 2,
        backgroundColor: IG.textPrimary,
        borderRadius: 1,
    },
});

export default BottomTabBar;
