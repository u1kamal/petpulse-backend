import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Video, Utensils, Droplet, Scale, Wifi, Clock, Package, BarChart } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styled } from 'nativewind';
import { WebView } from 'react-native-webview';

// Constants
import { API_URL } from '../config';
const BOWL_CAPACITY = 500; // grams

export default function Dashboard() {
    const router = useRouter();
    const [status, setStatus] = useState('Idle');
    const [weight, setWeight] = useState(0);
    const [containerWeight, setContainerWeight] = useState(500);
    const [isOnline, setIsOnline] = useState(false);
    const [customFood, setCustomFood] = useState('');
    const [customWater, setCustomWater] = useState('');
    const [deviceId, setDeviceId] = useState('');
    const [cameraIp, setCameraIp] = useState('');
    const [weeklyData, setWeeklyData] = useState<Record<string, number>>({});

    useEffect(() => {
        loadSettings();
        fetchAnalytics();
    }, []);

    const loadSettings = async () => {
        try {
            const id = await AsyncStorage.getItem('device_id');
            const ip = await AsyncStorage.getItem('camera_ip');
            if (id) setDeviceId(id);
            if (ip) setCameraIp(ip);
            else {
                // Optional: Alert if not set, or just let UI show placeholder
            }
        } catch (e) {
            console.error('Failed to load settings');
        }
    };

    const fetchAnalytics = async () => {
        try {
            const response = await fetch(`${API_URL}/analytics/weekly`);
            const data = await response.json();
            if (data.data) setWeeklyData(data.data);
        } catch (e) {
            console.log("Failed to fetch analytics");
        }
    };

    // Alert for low food
    const hasAlerted = React.useRef(false);
    useEffect(() => {
        if (containerWeight < 100 && !hasAlerted.current) {
            Alert.alert(
                "⚠️ Low Food Warning",
                `Storage is running low (${containerWeight}g left)! Please refill the container.`,
                [{ text: "OK" }]
            );
            hasAlerted.current = true;
        } else if (containerWeight >= 100) {
            hasAlerted.current = false;
        }
    }, [containerWeight]);

    // Poll for status
    useEffect(() => {
        if (!deviceId) return;

        const fetchStatus = async () => {
            try {
                const response = await fetch(`${API_URL}/device/${deviceId}/status`);
                const data = await response.json();
                if (data) {
                    setWeight(Math.round(data.weight));
                    setContainerWeight(Math.round(data.container_weight || 500));
                    setIsOnline(data.online);
                    // Only update status text if we are not currently sending a command
                    if (status === 'Idle' || status === 'Feeding completed' || status === 'Water dispensed') {
                        if (data.status && data.status !== 'Idle') {
                            setStatus(data.status);
                        }
                    }
                }
            } catch (e) {
                setIsOnline(false);
            }
        };

        fetchStatus(); // Initial fetch
        const interval = setInterval(fetchStatus, 2000); // Poll every 2s
        return () => clearInterval(interval);
    }, [deviceId]);



    const feed = async (amount: number) => {
        if (!deviceId) {
            Alert.alert('Error', 'Device ID not set. Please configure in Settings.');
            return;
        }
        setStatus(`Requesting ${amount}g...`);
        try {
            const response = await fetch(`${API_URL}/feed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device_id: deviceId, amount, unit: 'g' }),
            });
            await response.json();
            setStatus('Feeding...');
            setTimeout(() => setStatus('Idle'), 5000);
        } catch (e) {
            Alert.alert('Error', 'Failed to connect to feeder');
            setStatus('Error');
        }
    };

    const dispenseWater = async (amount: number) => {
        if (!deviceId) {
            Alert.alert('Error', 'Device ID not set. Please configure in Settings.');
            return;
        }
        setStatus(`Requesting ${amount}ml...`);
        try {
            const response = await fetch(`${API_URL}/water`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device_id: deviceId, amount, unit: 'ml' }),
            });
            await response.json();
            setStatus('Dispensing...');
            setTimeout(() => setStatus('Idle'), 5000);
        } catch (e) {
            Alert.alert('Error', 'Failed to connect to feeder');
            setStatus('Error');
        }
    };

    const refillContainer = async () => {
        if (!deviceId) return;
        try {
            const response = await fetch(`${API_URL}/device/${deviceId}/refill`, {
                method: 'POST',
            });
            const data = await response.json();
            setContainerWeight(data.container_weight);
            Alert.alert('Success', 'Storage container refilled to 500g!');
        } catch (e) {
            Alert.alert('Error', 'Failed to refill container');
        }
    };

    return (
        <ScrollView className="flex-1 bg-slate-50">
            <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-slate-200 pt-12">
                <TouchableOpacity onPress={() => router.back()}>
                    <ArrowLeft size={24} color="#1e293b" />
                </TouchableOpacity>
                <View className="items-center">
                    <Text className="font-bold text-lg text-black">Dashboard</Text>
                    <View className={`px-2 py-0.5 rounded-full flex-row items-center gap-1 ${isOnline ? 'bg-green-100' : 'bg-slate-100'}`}>
                        <View className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`} />
                        <Text className={`text-[10px] font-bold ${isOnline ? 'text-green-700' : 'text-slate-500'}`}>
                            {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </Text>
                    </View>
                </View>
                <View className="bg-blue-50 px-3 py-1 rounded-full">
                    <Text className="text-blue-700 text-xs font-bold">{status}</Text>
                </View>
            </View>

            <View className="p-6 gap-6">
                {/* Video Feed */}
                <View className="bg-black rounded-2xl h-56 justify-center items-center relative overflow-hidden">
                    {cameraIp ? (
                        <WebView
                            source={{ uri: `http://${cameraIp}:81/stream` }}
                            style={{ width: '100%', height: '100%' }}
                            scrollEnabled={false}
                        />
                    ) : (
                        <View className="items-center">
                            <Video size={48} color="#475569" />
                            <Text className="text-slate-500 mt-2">Configure Camera IP in Settings</Text>
                        </View>
                    )}
                    <View className="absolute top-4 left-4 bg-red-600 px-2 py-1 rounded flex-row items-center gap-2">
                        <View className="w-2 h-2 bg-white rounded-full" />
                        <Text className="text-white text-xs font-bold">LIVE</Text>
                    </View>
                </View>

                {/* Food Controls */}
                <View className="bg-white p-6 rounded-2xl border border-slate-200">
                    <View className="flex-row items-center gap-2 mb-4">
                        <Utensils size={20} color="#3b82f6" />
                        <Text className="font-bold text-black text-lg">Manual Feed</Text>
                    </View>

                    <View className="flex-row flex-wrap gap-2 mb-4">
                        {[50, 100, 150, 200].map((amt) => (
                            <TouchableOpacity
                                key={amt}
                                onPress={() => setCustomFood(amt.toString())}
                                className="bg-blue-50 border border-blue-100 px-4 py-3 rounded-lg flex-1 items-center"
                            >
                                <Text className="text-blue-700 font-bold">{amt}g</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View className="flex-row gap-2">
                        <TextInput
                            value={customFood}
                            onChangeText={setCustomFood}
                            placeholder="Amount (g)"
                            placeholderTextColor="#94a3b8"
                            keyboardType="numeric"
                            className="flex-1 border border-slate-200 rounded-lg px-4 py-3 bg-slate-50 text-black"
                        />
                        <TouchableOpacity
                            onPress={() => {
                                const val = parseInt(customFood);
                                if (val > 0) feed(val);
                            }}
                            className="bg-slate-900 px-6 justify-center rounded-lg"
                        >
                            <Text className="text-white font-bold">Feed</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Water Controls */}
                <View className="bg-white p-6 rounded-2xl border border-slate-200">
                    <View className="flex-row items-center gap-2 mb-4">
                        <Droplet size={20} color="#06b6d4" />
                        <Text className="font-bold text-black text-lg">Dispense Water</Text>
                    </View>

                    <View className="flex-row flex-wrap gap-2 mb-4">
                        {[50, 100, 150, 200].map((amt) => (
                            <TouchableOpacity
                                key={amt}
                                onPress={() => setCustomWater(amt.toString())}
                                className="bg-cyan-50 border border-cyan-100 px-4 py-3 rounded-lg flex-1 items-center"
                            >
                                <Text className="text-cyan-700 font-bold">{amt}ml</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View className="flex-row gap-2">
                        <TextInput
                            value={customWater}
                            onChangeText={setCustomWater}
                            placeholder="Amount (ml)"
                            placeholderTextColor="#94a3b8"
                            keyboardType="numeric"
                            className="flex-1 border border-slate-200 rounded-lg px-4 py-3 bg-slate-50 text-black"
                        />
                        <TouchableOpacity
                            onPress={() => {
                                const val = parseInt(customWater);
                                if (val > 0) dispenseWater(val);
                            }}
                            className="bg-slate-900 px-6 justify-center rounded-lg"
                        >
                            <Text className="text-white font-bold">Pour</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats */}
                <View className="flex-row gap-4">
                    <View className="flex-1 bg-white p-4 rounded-2xl border border-slate-200">
                        <View className="flex-row justify-between items-start mb-2">
                            <Text className="text-xs font-bold text-slate-400 uppercase">Weight</Text>
                            <Scale size={16} color="#3b82f6" />
                        </View>
                        <Text className="text-3xl font-bold text-black">{weight}<Text className="text-sm text-slate-400">g</Text></Text>
                        <View className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
                            <View className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min((weight / BOWL_CAPACITY) * 100, 100)}%` }} />
                        </View>
                    </View>
                </View>

                {/* Storage Container Stats */}
                <View className="flex-row gap-4">
                    <View className="flex-1 bg-white p-4 rounded-2xl border border-slate-200">
                        <View className="flex-row justify-between items-start mb-2">
                            <Text className="text-xs font-bold text-slate-400 uppercase">Storage</Text>
                            <Package size={16} color={containerWeight < 100 ? "#ef4444" : containerWeight < 350 ? "#eab308" : "#22c55e"} />
                        </View>
                        <Text className={`text-3xl font-bold ${containerWeight < 100 ? "text-red-500" : containerWeight < 350 ? "text-yellow-600" : "text-green-600"}`}>
                            {containerWeight}<Text className="text-sm text-slate-400">g</Text>
                        </Text>
                        <View className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
                            <View
                                className={`h-1.5 rounded-full ${containerWeight < 100 ? "bg-red-500" : containerWeight < 350 ? "bg-yellow-500" : "bg-green-500"}`}
                                style={{ width: `${Math.min((containerWeight / 500) * 100, 100)}%` }}
                            />
                        </View>
                        {containerWeight < 500 && (
                            <TouchableOpacity
                                onPress={refillContainer}
                                className="mt-3 bg-slate-900 py-2 rounded-lg items-center"
                            >
                                <Text className="text-white text-xs font-bold">Refill</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Schedule Button */}
                <View className="flex-row gap-4">
                    <TouchableOpacity
                        onPress={() => router.push('/schedules')}
                        className="flex-1 bg-white p-4 rounded-2xl border border-slate-200 flex-row items-center justify-between"
                    >
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center">
                                <Clock size={20} color="#f97316" />
                            </View>
                            <View>
                                <Text className="font-bold text-black">Schedule</Text>
                                <Text className="text-slate-500 text-[10px]">Auto-feed</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push('/history')}
                        className="flex-1 bg-white p-4 rounded-2xl border border-slate-200 flex-row items-center justify-between"
                    >
                        <View className="flex-row items-center gap-3">
                            <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center">
                                <BarChart size={20} color="#9333ea" />
                            </View>
                            <View>
                                <Text className="font-bold text-black">History</Text>
                                <Text className="text-slate-500 text-[10px]">Logs</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Weekly Insights */}
                <View className="bg-white p-6 rounded-2xl border border-slate-200 mb-6">
                    <View className="flex-row items-center gap-2 mb-6">
                        <BarChart size={20} color="#64748b" />
                        <Text className="font-bold text-black text-lg">Weekly Insights</Text>
                    </View>

                    <View className="flex-row justify-between items-end h-32 px-2">
                        {Object.entries(weeklyData).map(([day, amount]) => {
                            const height = Math.min((amount / 500) * 100, 100); // Max 500g scale
                            const isHigh = amount > 300;
                            return (
                                <View key={day} className="items-center gap-2 flex-1">
                                    <View className="w-full items-center">
                                        <Text className="text-[10px] text-slate-400 mb-1">{amount > 0 ? amount : ''}</Text>
                                        <View
                                            className={`w-2 rounded-full ${isHigh ? 'bg-red-400' : 'bg-blue-500'}`}
                                            style={{ height: `${Math.max(height, 5)}%` }}
                                        />
                                    </View>
                                    <Text className="text-xs font-bold text-slate-500">{day}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

            </View>
        </ScrollView>
    );
}
