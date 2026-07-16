import { StyleSheet } from 'react-native';

// Instagram-style design system
export const IG = {
    // Colors
    white: '#FFFFFF',
    black: '#000000',
    background: '#FAFAFA',
    border: '#DBDBDB',
    textPrimary: '#262626',
    textSecondary: '#8E8E8E',
    textMuted: '#C7C7C7',
    blue: '#0095F6',
    red: '#ED4956',
    surface: '#FFFFFF',

    // Instagram gradient colors (logo colors)
    gradientColors: ['#833AB4', '#FD1D1D', '#FCB045'],

    // Tab bar
    tabBar: '#FFFFFF',
    tabBarBorder: '#DBDBDB',
    tabActive: '#262626',
    tabInactive: '#8E8E8E',

    // Story ring gradient
    storyRing: ['#F58529', '#DD2A7B', '#8134AF', '#515BD4'],
};

export const COLORS = {
    red: {
        primary: '#ED4956',
        secondary: '#FFDAC1',
        background: '#FAFAFA',
        text: '#262626',
        card: '#FFFFFF',
        accent: '#ED4956',
        gradient: ['#833AB4', '#FD1D1D', '#FCB045'],
    },
    blue: {
        primary: '#0095F6',
        secondary: '#C4E0E5',
        background: '#FAFAFA',
        text: '#262626',
        card: '#FFFFFF',
        accent: '#0095F6',
        gradient: ['#833AB4', '#FD1D1D', '#FCB045'],
    },
    green: {
        primary: '#23D160',
        secondary: '#E0F2F1',
        background: '#FAFAFA',
        text: '#262626',
        card: '#FFFFFF',
        accent: '#23D160',
        gradient: ['#833AB4', '#FD1D1D', '#FCB045'],
    },
    purple: {
        primary: '#833AB4',
        secondary: '#F3E5F5',
        background: '#FAFAFA',
        text: '#262626',
        card: '#FFFFFF',
        accent: '#833AB4',
        gradient: ['#833AB4', '#FD1D1D', '#FCB045'],
    },
    common: {
        white: '#FFFFFF',
        black: '#262626',
        gray: '#8E8E8E',
        lightGray: '#FAFAFA',
    }
};

export const getTheme = (colorScheme) => {
    return COLORS[colorScheme] || COLORS.red;
};

export const commonStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: IG.background,
    },
    igHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: IG.white,
        borderBottomWidth: 0.5,
        borderBottomColor: IG.border,
    },
    igHeaderTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: IG.textPrimary,
        fontStyle: 'italic',
        fontFamily: 'serif',
    },
    card: {
        backgroundColor: IG.white,
        marginBottom: 8,
    },
    input: {
        backgroundColor: IG.background,
        borderWidth: 1,
        borderColor: IG.border,
        borderRadius: 8,
        padding: 14,
        fontSize: 14,
        color: IG.textPrimary,
        marginBottom: 12,
    },
    button: {
        backgroundColor: IG.blue,
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: IG.white,
        fontWeight: '600',
        fontSize: 14,
    },
});
