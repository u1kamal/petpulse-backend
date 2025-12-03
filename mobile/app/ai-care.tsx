import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Wand2, Utensils, MessageCircle, Send } from 'lucide-react-native';
import { styled } from 'nativewind';
import { API_URL } from '../config';

export default function AICare() {
    const router = useRouter();

    // Diet Planner State
    const [petName, setPetName] = useState('');
    const [species, setSpecies] = useState('');
    const [breed, setBreed] = useState('');
    const [weight, setWeight] = useState('');
    const [age, setAge] = useState('');
    const [loadingDiet, setLoadingDiet] = useState(false);
    const [dietPlan, setDietPlan] = useState('');

    // Chat State
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([
        { role: 'ai', text: "Hello! I'm your AI Pet Assistant. Ask me anything about your pet's behavior, health, or training! 🐾" }
    ]);
    const [loadingChat, setLoadingChat] = useState(false);

    const generateDietPlan = async () => {
        if (!petName || !species || !weight || !age) {
            alert("Please fill in all details!");
            return;
        }
        setLoadingDiet(true);

        try {
            const response = await fetch(`${API_URL}/diet-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pet_name: petName,
                    species,
                    breed,
                    weight: parseFloat(weight),
                    age: parseFloat(age)
                })
            });
            const data = await response.json();
            if (response.ok) {
                setDietPlan(data.plan);
            } else {
                alert("Failed to generate plan: " + (data.detail || "Unknown error"));
            }
        } catch (e) {
            alert("Network Error: Is the backend running?");
            console.error(e);
        } finally {
            setLoadingDiet(false);
        }
    };

    const sendChatMessage = async () => {
        if (!chatInput.trim()) return;

        const userMsg = chatInput.trim();
        setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
        setChatInput('');
        setLoadingChat(true);

        try {
            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    context: `Pet: ${petName} (${species}), Weight: ${weight}kg, Age: ${age}`
                })
            });
            const data = await response.json();
            if (response.ok) {
                setChatHistory(prev => [...prev, { role: 'ai', text: data.response }]);
            } else {
                setChatHistory(prev => [...prev, { role: 'ai', text: "Error: " + (data.detail || "Could not reach AI.") }]);
            }
        } catch (e) {
            setChatHistory(prev => [...prev, { role: 'ai', text: "Network Error. Is the backend running?" }]);
        } finally {
            setLoadingChat(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            className="bg-slate-50"
        >
            <ScrollView className="flex-1">
                {/* Header */}
                <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-slate-200 pt-12">
                    <TouchableOpacity onPress={() => router.back()}>
                        <ArrowLeft size={24} color="#1e293b" />
                    </TouchableOpacity>
                    <Text className="font-bold text-lg text-black">AI Care Center</Text>
                    <Wand2 size={24} color="#9333ea" />
                </View>

                <View className="p-6 gap-8">

                    {/* Feature 1: Diet Planner */}
                    <View className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm">
                        <View className="flex-row items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                            <View className="w-10 h-10 bg-purple-100 rounded-full justify-center items-center">
                                <Utensils size={20} color="#9333ea" />
                            </View>
                            <Text className="text-xl font-bold text-black">Smart Diet Planner</Text>
                        </View>

                        <View className="gap-4">
                            <View>
                                <Text className="text-sm font-bold text-slate-700 mb-1">Pet Name</Text>
                                <TextInput
                                    value={petName} onChangeText={setPetName} placeholder="e.g. Luna"
                                    placeholderTextColor="#94a3b8"
                                    className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-black"
                                />
                            </View>

                            <View className="flex-row gap-4">
                                <View className="flex-1">
                                    <Text className="text-sm font-bold text-slate-700 mb-1">Species</Text>
                                    <TextInput
                                        value={species} onChangeText={setSpecies} placeholder="Dog/Cat"
                                        placeholderTextColor="#94a3b8"
                                        className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-black"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-bold text-slate-700 mb-1">Breed</Text>
                                    <TextInput
                                        value={breed} onChangeText={setBreed} placeholder="e.g. Golden"
                                        placeholderTextColor="#94a3b8"
                                        className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-black"
                                    />
                                </View>
                            </View>

                            <View className="flex-row gap-4">
                                <View className="flex-1">
                                    <Text className="text-sm font-bold text-slate-700 mb-1">Weight (kg)</Text>
                                    <TextInput
                                        value={weight} onChangeText={setWeight} placeholder="4.5" keyboardType="numeric"
                                        placeholderTextColor="#94a3b8"
                                        className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-black"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-bold text-slate-700 mb-1">Age (Years)</Text>
                                    <TextInput
                                        value={age} onChangeText={setAge} placeholder="3" keyboardType="numeric"
                                        placeholderTextColor="#94a3b8"
                                        className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-black"
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={generateDietPlan}
                                disabled={loadingDiet}
                                className="bg-purple-600 py-3 rounded-lg flex-row justify-center items-center gap-2 mt-2"
                            >
                                {loadingDiet ? <ActivityIndicator color="white" /> : <Wand2 size={18} color="white" />}
                                <Text className="text-white font-bold">Generate Plan</Text>
                            </TouchableOpacity>

                            {dietPlan ? (
                                <View className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                                    <Text className="font-bold text-purple-900 mb-2">Recommendation:</Text>
                                    <Text className="text-purple-800 leading-relaxed">{dietPlan}</Text>
                                </View>
                            ) : null}
                        </View>
                    </View>

                    {/* Feature 2: Chat */}
                    <View className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
                        <View className="flex-row items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                            <View className="w-10 h-10 bg-blue-100 rounded-full justify-center items-center">
                                <MessageCircle size={20} color="#2563eb" />
                            </View>
                            <Text className="text-xl font-bold text-black">Behavior Assistant</Text>
                        </View>

                        <View className="bg-slate-50 rounded-xl p-4 h-64 mb-4">
                            <ScrollView
                                nestedScrollEnabled={true}
                                ref={ref => ref?.scrollToEnd({ animated: true })}
                                onContentSizeChange={() => { }}
                            >
                                {chatHistory.map((msg, idx) => (
                                    <View key={idx} className={`flex-row mb-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <View className={`p-3 rounded-lg max-w-[80%] ${msg.role === 'user' ? 'bg-blue-600 rounded-tr-none' : 'bg-white border border-slate-200 rounded-tl-none'}`}>
                                            <Text className={msg.role === 'user' ? 'text-white' : 'text-black'}>{msg.text}</Text>
                                        </View>
                                    </View>
                                ))}
                                {loadingChat && (
                                    <View className="flex-row justify-start mb-3">
                                        <View className="bg-white p-3 rounded-lg rounded-tl-none border border-slate-200">
                                            <ActivityIndicator size="small" color="#64748b" />
                                        </View>
                                    </View>
                                )}
                            </ScrollView>
                        </View>

                        <View className="flex-row gap-2">
                            <TextInput
                                value={chatInput}
                                onChangeText={setChatInput}
                                placeholder="Ask about behavior..."
                                placeholderTextColor="#94a3b8"
                                className="flex-1 border border-slate-200 rounded-lg px-4 py-3 bg-white text-black"
                            />
                            <TouchableOpacity
                                onPress={sendChatMessage}
                                className="bg-blue-600 w-12 justify-center items-center rounded-lg"
                            >
                                <Send size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>

                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
