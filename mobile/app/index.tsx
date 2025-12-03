import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { PawPrint, Wand2, Settings } from 'lucide-react-native';
import { styled } from 'nativewind';

export default function LandingPage() {
    const router = useRouter();

    return (
        <ScrollView className="flex-1 bg-slate-50">
            {/* Navbar */}
            <View className="flex-row justify-between items-center px-6 py-4 bg-white/90 border-b border-slate-200 pt-12">
                <View className="flex-row items-center gap-2">
                    <Image source={require('../assets/icon.png')} style={{ width: 32, height: 32, borderRadius: 8 }} />
                    <Text className="font-bold text-xl text-slate-900">PetPulse</Text>
                </View>
            </View>

            {/* Hero Section */}
            <View className="pt-20 pb-20 px-6 items-center">
                <Text className="text-4xl font-bold text-center text-slate-900 mb-4">
                    Control your pet feeder
                </Text>
                <Text className="text-4xl font-bold text-center text-blue-600 mb-6">
                    from anywhere.
                </Text>
                <Text className="text-lg text-slate-600 text-center mb-10 leading-relaxed">
                    This is the mobile app controller. Access the dashboard to feed your pet or use the AI assistant.
                </Text>

                <View className="w-full gap-4">
                    <TouchableOpacity
                        onPress={() => router.push('/dashboard')}
                        className="bg-slate-900 py-4 rounded-xl flex-row justify-center items-center gap-2"
                    >
                        <Text className="text-white font-bold text-lg">Open Dashboard</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push('/ai-care')}
                        className="bg-white border border-purple-200 py-4 rounded-xl flex-row justify-center items-center gap-2 shadow-sm"
                    >
                        <Wand2 size={20} color="#9333ea" />
                        <Text className="text-purple-600 font-bold text-lg">AI Assistant</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push('/settings')}
                        className="mt-4 py-4 flex-row justify-center items-center gap-2"
                    >
                        <Settings size={18} color="#64748b" />
                        <Text className="text-slate-500 font-medium">Configure Device</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}
