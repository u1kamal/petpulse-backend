import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock, Plus, Trash2 } from 'lucide-react-native';
import { styled } from 'nativewind';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Schedules() {
    const router = useRouter();
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [newTime, setNewTime] = useState('');
    const [newAmount, setNewAmount] = useState('50');

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/schedules`);
            const data = await response.json();
            setSchedules(data);
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to load schedules");
        } finally {
            setLoading(false);
        }
    };

    const addSchedule = async () => {
        if (!newTime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
            Alert.alert("Invalid Time", "Please use HH:MM format (e.g., 08:30 or 18:00)");
            return;
        }

        const deviceId = await AsyncStorage.getItem('device_id');
        if (!deviceId) {
            Alert.alert("Error", "Device ID not found");
            console.log("DEBUG: Device ID missing");
            return;
        }
        console.log("DEBUG: Sending schedule request", { deviceId, newTime, newAmount });

        try {
            const response = await fetch(`${API_URL}/schedules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device_id: deviceId,
                    time: newTime,
                    amount: parseInt(newAmount),
                    unit: 'g'
                })
            });

            if (response.ok) {
                setNewTime('');
                fetchSchedules();
            } else {
                const errorText = await response.text();
                console.log("DEBUG: Add schedule failed", errorText);
                Alert.alert("Error", "Failed to add schedule: " + errorText);
            }
        } catch (e) {
            console.log("DEBUG: Network error", e);
            Alert.alert("Error", "Network error");
        }
    };

    const deleteSchedule = async (id: string) => {
        try {
            await fetch(`${API_URL}/schedules/${id}`, { method: 'DELETE' });
            fetchSchedules();
        } catch (e) {
            Alert.alert("Error", "Failed to delete");
        }
    };

    return (
        <ScrollView className="flex-1 bg-slate-50">
            <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-slate-200 pt-12">
                <TouchableOpacity onPress={() => router.back()}>
                    <ArrowLeft size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text className="font-bold text-lg text-slate-900">Feeding Schedule</Text>
                <View className="w-6" />
            </View>

            <View className="p-6 gap-6">
                {/* Add New Schedule */}
                <View className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <View className="flex-row items-center gap-2 mb-4">
                        <Plus size={20} color="#3b82f6" />
                        <Text className="font-bold text-slate-800 text-lg">Add New Feed</Text>
                    </View>

                    <View className="flex-row gap-4 mb-4">
                        <View className="flex-1">
                            <Text className="text-xs font-bold text-slate-500 mb-1">TIME (24H)</Text>
                            <TextInput
                                value={newTime}
                                onChangeText={setNewTime}
                                placeholder="08:00"
                                className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-lg font-bold"
                            />
                        </View>
                        <View className="flex-1">
                            <Text className="text-xs font-bold text-slate-500 mb-1">AMOUNT (g)</Text>
                            <TextInput
                                value={newAmount}
                                onChangeText={setNewAmount}
                                placeholder="50"
                                keyboardType="numeric"
                                className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-lg font-bold"
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={addSchedule}
                        className="bg-blue-600 py-3 rounded-lg items-center"
                    >
                        <Text className="text-white font-bold">Save Schedule</Text>
                    </TouchableOpacity>
                </View>

                {/* List Schedules */}
                <View>
                    <Text className="font-bold text-slate-900 text-lg mb-4">Active Schedules</Text>

                    {loading ? (
                        <ActivityIndicator size="large" color="#3b82f6" />
                    ) : schedules.length === 0 ? (
                        <Text className="text-slate-500 text-center py-8">No schedules set yet.</Text>
                    ) : (
                        schedules.map((item) => (
                            <View key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 mb-3 flex-row items-center justify-between">
                                <View className="flex-row items-center gap-4">
                                    <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center">
                                        <Clock size={20} color="#3b82f6" />
                                    </View>
                                    <View>
                                        <Text className="text-xl font-bold text-slate-800">{item.time}</Text>
                                        <Text className="text-slate-500">{item.amount}g Food</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={() => deleteSchedule(item.id)}
                                    className="p-2 bg-red-50 rounded-lg"
                                >
                                    <Trash2 size={20} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>
            </View>
        </ScrollView>
    );
}
