import API_URL from '@/constants/Config';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PackageApi from "../api/packageApi";

type PackType = {
    _id: String,
    name: "String",
    price: number,
    description: String,
    status: "Active" | "Inactive" | String
}
const RegisterFleetOperator = () => {
    const router = useRouter();
    const [qrUrl, setQrUrl] = useState('');
    const [isLoading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string>("");
    const [userRole, setUserRole] = useState<string>("");
    const [pack, setPack] = useState<PackType>();

    useEffect(() => {
        const fetchUserData = async () => {
            const dataId = await AsyncStorage.getItem("USER_PROFILE_ID");
            const dataProfile = await AsyncStorage.getItem("USER_PROFILE");

            if (dataId) setUserId(JSON.parse(dataId));
            if (dataProfile) {
                const profile = JSON.parse(dataProfile);
                setUserRole(profile.role);
            }
        }

        const fetchPackage = async () => {
            const rs = await PackageApi.getById("69bfb75e77852f25b566f1fe");
            setPack(rs);
        }
        fetchPackage();
        fetchUserData();
    }, [])

    const handlePayment = async () => {
        setLoading(true);
        try {
            const data = await fetch(`${API_URL}/sepay/payment`, {
                method: "POST",
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    order_description: "Nạp tiền nâng cấp tài khoản",
                    order_amount: pack?.price,
                    package_id: "69bfb75e77852f25b566f1fe",
                    customer_id: userId
                })
            });
            const response = await data.json();

            if (response.success) {
                setQrUrl(response.paymentCheckoutUrl)
            } else {
                alert("Lỗi từ server: " + response.message);
            }
        } catch (e) {
            alert(e);
        } finally {
            setLoading(false);
        }
    }

    if (userRole === 'FLEET_OPERATOR') {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.successCard}>
                    <View style={styles.iconWrapper}>
                        <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
                    </View>
                    <Text style={styles.successTitle}>Chúc mừng!</Text>
                    <Text style={styles.successSubtitle}>Bạn đã là vận hành bay. Không cần nâng cấp thêm.</Text>

                    <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(FleetOperator)')}>
                        <Text style={styles.btnText}>Đến bộ đàm Fleet Operator</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {qrUrl ? (
                    <View style={styles.contentQr}>
                        <Text style={styles.headerTitle}>Thanh toán</Text>
                        <Text style={styles.headerSubtitle}>Quét mã QR bằng ứng dụng ngân hàng</Text>

                        <View style={styles.qrCard}>
                            <View style={styles.qrWrapper}>
                                <Image source={{ uri: qrUrl }} style={styles.qrImage} />
                            </View>

                            <View style={styles.receiptContainer}>
                                <View style={styles.receiptRow}>
                                    <Text style={styles.receiptLabel}>Tên gói:</Text>
                                    <Text style={styles.receiptValue}>{pack?.name}</Text>
                                </View>
                                <View style={styles.receiptRow}>
                                    <Text style={styles.receiptLabel}>Mô tả:</Text>
                                    <Text style={[styles.receiptValue, styles.receiptDesc]}>{pack?.description}</Text>
                                </View>
                                <View style={[styles.receiptRow, styles.receiptTotalRow]}>
                                    <Text style={styles.receiptTotalLabel}>Tổng tiền:</Text>
                                    <Text style={styles.receiptTotalValue}>
                                        {pack?.price ? pack.price.toLocaleString('vi-VN') : 0} đ
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.content}>
                        <Text style={styles.headerTitle}>Đăng ký vận hành</Text>
                        <Text style={styles.headerSubtitle}>Mở khoá toàn bộ tính năng vượt trội</Text>

                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>Gói Vận Hành Chuyên Nghiệp</Text>
                            </View>

                            <View style={styles.featureList}>
                                <View style={styles.featureItem}>
                                    <View style={styles.iconBox}>
                                        <Ionicons name="location" size={20} color="#0055FF" />
                                    </View>
                                    <Text style={styles.featureText}>Theo dõi drone thời gian thực</Text>
                                </View>
                                <View style={styles.featureItem}>
                                    <View style={styles.iconBox}>
                                        <Ionicons name="map" size={20} color="#0055FF" />
                                    </View>
                                    <Text style={styles.featureText}>Khởi tạo và lưu đường bay (Flight Plan)</Text>
                                </View>
                                <View style={styles.featureItem}>
                                    <View style={styles.iconBox}>
                                        <Ionicons name="calendar" size={20} color="#0055FF" />
                                    </View>
                                    <Text style={styles.featureText}>Lên lịch và quản lý nhiệm vụ (Mission)</Text>
                                </View>
                                <View style={styles.featureItem}>
                                    <View style={styles.iconBox}>
                                        <Ionicons name="airplane" size={20} color="#0055FF" />
                                    </View>
                                    <Text style={styles.featureText}>Quản lý đội bay chuyên nghiệp</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.primaryBtn}
                                onPress={handlePayment}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Text style={styles.btnText}>Mua nâng cấp - {pack?.price ? pack.price.toLocaleString('vi-VN') : 0} đ</Text>
                                        <Ionicons name="cart" size={20} color="#fff" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F4F6F9', // Nền xám nhạt hiện đại
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 40,
        alignItems: 'center'
    },
    // --- QR STYLES ---
    contentQr: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 40,
        alignItems: 'center',
    },
    qrCard: {
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation:5,
        marginTop: 10,
    },
    qrWrapper: {
        padding: 16,
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    qrImage: {
        width: 220,
        height: 220,
        borderRadius: 8,
    },
    receiptContainer: {
        width: '100%',
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 16,
        gap: 12,
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: '#E9ECEF',
        paddingBottom: 12,
    },
    receiptLabel: {
        fontSize: 14,
        color: '#6C757D',
        fontWeight: '500',
        flex: 1,
    },
    receiptValue: {
        fontSize: 15,
        color: '#212529',
        fontWeight: '600',
        flex: 2,
        textAlign: 'right',
    },
    receiptDesc: {
        fontWeight: '400',
        color: '#495057',
    },
    receiptTotalRow: {
        borderBottomWidth: 0,
        paddingBottom: 0,
        paddingTop: 4,
        alignItems: 'center',
    },
    receiptTotalLabel: {
        fontSize: 16,
        color: '#212529',
        fontWeight: 'bold',
    },
    receiptTotalValue: {
        fontSize: 20,
        color: '#E63946', // Đỏ đô hiện đại
        fontWeight: 'bold',
    },

    // --- TYPOGRAPHY ---
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1A1D1E',
        marginBottom: 8,
        textAlign: 'center'
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#6C757D',
        marginBottom: 32,
        textAlign: 'center'
    },

    // --- PACKAGE CARD ---
    card: {
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#0055FF',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 8,
    },
    cardHeader: {
        backgroundColor: '#F0F5FF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0055FF',
        textAlign: 'center'
    },
    featureList: {
        marginBottom: 32,
        gap: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0F5FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureText: {
        fontSize: 15,
        color: '#343A40',
        marginLeft: 16,
        flex: 1,
        lineHeight: 22,
    },

    // --- BUTTONS ---
    primaryBtn: {
        flexDirection: 'row',
        backgroundColor: '#0055FF', // Xanh dương chủ đạo thay vì đen
        paddingVertical: 16,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        shadowColor: '#0055FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    btnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },

    // --- SUCCESS SCREEN ---
    successCard: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    iconWrapper: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#2E7D32',
        marginBottom: 12,
        textAlign: 'center'
    },
    successSubtitle: {
        fontSize: 16,
        color: '#546E7A',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24
    }
});

export default RegisterFleetOperator;