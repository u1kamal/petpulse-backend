import { Stack } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
// import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
// Notifications.setNotificationHandler({
//     handleNotification: async () => ({
//         shouldShowAlert: true,
//         shouldPlaySound: true,
//         shouldSetBadge: false,
//     }),
// });

export default function Layout() {
    useEffect(() => {
        // registerForPushNotificationsAsync();
    }, []);

    // async function registerForPushNotificationsAsync() {
    //     if (Platform.OS === 'android') {
    //         await Notifications.setNotificationChannelAsync('default', {
    //             name: 'default',
    //             importance: Notifications.AndroidImportance.MAX,
    //             vibrationPattern: [0, 250, 250, 250],
    //             lightColor: '#FF231F7C',
    //         });
    //     }
    //
    //     const { status: existingStatus } = await Notifications.getPermissionsAsync();
    //     let finalStatus = existingStatus;
    //     if (existingStatus !== 'granted') {
    //         const { status } = await Notifications.requestPermissionsAsync();
    //         finalStatus = status;
    //     }
    //     if (finalStatus !== 'granted') {
    //         console.log('Failed to get push token for push notification!');
    //         return;
    //     }
    // }

    return (
        <>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="dashboard" />
                <Stack.Screen name="ai-care" />
                <Stack.Screen name="settings" />
            </Stack>
            <StatusBar style="auto" />
        </>
    );
}
