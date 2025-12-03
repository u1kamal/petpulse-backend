import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock, Calendar } from 'lucide-react-native';
import { styled } from 'nativewind';
import { API_URL } from '../config';

export default function History() {
    const router = useRouter();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const response = await fetch(`${API_URL}/history`);
            const data = await response.json();
            if (data.history) {
                setHistory(data.history);
            }
        } catch (e) {
            console.error("Failed to fetch history");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return {
            day: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
    };

    return (
        <View className="flex-1 bg-slate-50">
            <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-slate-200 pt-12">
                <TouchableOpacity onPress={() => router.back()}>
                    <ArrowLeft size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text className="font-bold text-lg text-slate-900">Feeding History</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            ) : (
                <ScrollView className="flex-1 p-6">
                    {history.length === 0 ? (
                        <View className="items-center mt-10">
                            <Text className="text-slate-400">No feeding history yet.</Text>
                        </View>
                    ) : (
                        <View className="gap-3 pb-10">
                            {history.map((item, index) => {
                                const { day, time } = formatDate(item.timestamp);
                                return (
                                    <View key={index} className="bg-white p-4 rounded-xl border border-slate-100 flex-row justify-between items-center">
                                        <View className="flex-row items-center gap-3">
                                            <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center">
                                                <Calendar size={18} color="#3b82f6" />
                                            </View>
                                            <View>
                                                <Text className="font-bold text-slate-800">{day}</Text>
                                                <Text className="text-xs text-slate-400">{time}</Text>
                                            </View>
                                        </View>
                                        <View className="items-end">
                                            <Text className="font-bold text-lg text-blue-600">
                                                {item.amount}<Text className="text-sm text-slate-400">{item.unit}</Text>
                                            </Text>
                                            <Text className="text-[10px] text-slate-400 uppercase">Dispensed</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}
