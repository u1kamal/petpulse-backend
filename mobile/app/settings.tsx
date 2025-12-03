import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ArrowLeft, Save } from 'lucide-react-native';
import { styled } from 'nativewind';

export default function Settings() {
    const router = useRouter();
    const [deviceId, setDeviceId] = useState('');
    const [cameraIp, setCameraIp] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const id = await AsyncStorage.getItem('device_id');
            const ip = await AsyncStorage.getItem('camera_ip');
            if (id) setDeviceId(id);
            if (ip) setCameraIp(ip);
        } catch (e) {
            console.error('Failed to load settings');
        }
    };

    const saveSettings = async () => {
        if (!deviceId.trim()) {
            Alert.alert('Error', 'Device ID cannot be empty');
            return;
        }
        try {
            await AsyncStorage.setItem('device_id', deviceId.trim());
            if (cameraIp.trim()) {
                await AsyncStorage.setItem('camera_ip', cameraIp.trim());
            }
            Alert.alert('Success', 'Settings saved!');
            router.back();
        } catch (e) {
            Alert.alert('Error', 'Failed to save settings');
        }
    };

    return (
        <View className="flex-1 bg-slate-50">
            <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-slate-200 pt-12">
                <TouchableOpacity onPress={() => router.back()}>
                    <ArrowLeft size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text className="font-bold text-lg text-slate-900">Settings</Text>
                <View style={{ width: 24 }} />
            </View>

            <View className="p-6">
                <Text className="text-sm font-bold text-slate-700 mb-2">Device ID</Text>
                <Text className="text-xs text-slate-500 mb-4">
                    Enter the unique ID flashed to your ESP32 (e.g., Feeder_01).
                </Text>

                <TextInput
                    value={deviceId}
                    onChangeText={setDeviceId}
                    placeholder="Feeder_01"
                    className="border border-slate-200 rounded-lg p-4 bg-white mb-6 text-lg"
                />

                <Text className="text-sm font-bold text-slate-700 mb-2">Camera IP</Text>
                <Text className="text-xs text-slate-500 mb-4">
                    Enter the IP address of your ESP32-CAM (e.g., 192.168.1.50).
                </Text>

                <TextInput
                    value={cameraIp}
                    onChangeText={setCameraIp}
                    placeholder="192.168.1.50"
                    keyboardType="numeric"
                    className="border border-slate-200 rounded-lg p-4 bg-white mb-6 text-lg"
                />

                <TouchableOpacity
                    onPress={saveSettings}
                    className="bg-slate-900 py-4 rounded-xl flex-row justify-center items-center gap-2"
                >
                    <Save size={20} color="white" />
                    <Text className="text-white font-bold text-lg">Save Settings</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
