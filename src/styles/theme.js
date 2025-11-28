import { StyleSheet } from 'react-native';

export const COLORS = {
    red: {
        primary: '#FF8080', // Soft Red (Readable with white)
        secondary: '#FFDAC1',
        background: '#FFF9F9',
        text: '#6D4C41',
        card: '#FFFFFF',
        accent: '#FF9AA2'
    },
    blue: {
        primary: '#779ECB', // Soft Blue (Readable with white)
        secondary: '#C4E0E5',
        background: '#F9FDFF',
        text: '#455A64',
        card: '#FFFFFF',
        accent: '#93C8D5'
    },
    common: {
        white: '#FFFFFF',
        black: '#444444',
        gray: '#9E9E9E',
        lightGray: '#F5F5F5',
    }
};

export const getTheme = (colorScheme) => {
    return colorScheme === 'blue' ? COLORS.blue : COLORS.red;
};

export const commonStyles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        backgroundColor: '#fff',
    },
    button: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    card: {
        padding: 15,
        borderRadius: 15,
        backgroundColor: '#fff',
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    }
});
