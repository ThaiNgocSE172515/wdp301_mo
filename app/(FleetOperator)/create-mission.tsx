import missionApi from '@/api/missionApi';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CreateMissionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'DRAFT',
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên nhiệm vụ");
      return;
    }
    
    try {
      setLoading(true);
      await missionApi.create(formData);
      Alert.alert("Thành công", "Đã tạo nhiệm vụ mới", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (e: any) {
      const errorMsg = e.response?.data?.message || e.message || "Lỗi không xác định";
      Alert.alert("Lỗi", `Không thể tạo nhiệm vụ: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F222A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo Nhiệm vụ mới</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tên nhiệm vụ (*)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: Bay giám sát khu vực A"
            value={formData.name}
            onChangeText={(t) => setFormData({ ...formData, name: t })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Mô tả</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Ghi chú chi tiết cho nhiệm vụ này..."
            multiline
            numberOfLines={4}
            value={formData.description}
            onChangeText={(t) => setFormData({ ...formData, description: t })}
          />
        </View>

        <TouchableOpacity 
          style={styles.submitBtn} 
          onPress={handleCreate} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
                <Ionicons name="add-circle-outline" size={20} color="#fff" style={{marginRight: 8}}/>
                <Text style={styles.submitBtnText}>TẠO NHIỆM VỤ</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9', paddingTop: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F222A' },
  
  content: { padding: 20 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: 'bold', color: '#1F222A', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#1F222A',
  },
  textArea: { height: 120, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: '#0055FF',
    flexDirection: 'row',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#0055FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
});
