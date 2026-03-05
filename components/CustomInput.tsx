import React from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ViewStyle, 
  TextInputProps,
  TextStyle 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Định nghĩa các props truyền vào
interface CustomInputProps extends TextInputProps {
  label?: string; // Label hiển thị trên input (nếu có)
  containerStyle?: ViewStyle; // Style cho khung bao ngoài
  inputStyle?: TextStyle; // Style cho chữ bên trong
  rightIcon?: keyof typeof Ionicons.glyphMap; // Tên icon bên phải (ví dụ: "eye")
  onRightIconPress?: () => void; // Hàm xử lý khi bấm icon
}

const CustomInput = ({
  label,
  containerStyle,
  inputStyle,
  rightIcon,
  onRightIconPress,
  ...props // Các props còn lại của TextInput (value, onChangeText,...)
}: CustomInputProps) => {
  return (
    <View style={styles.wrapper}>
      {/* 1. Nếu có label thì hiển thị */}
      {label && <Text style={styles.label}>{label}</Text>}
      {/* 2. Khung Input */}
      <View style={[styles.inputContainer, containerStyle]}>
        <TextInput
          style={[styles.input, inputStyle]}
          placeholderTextColor="#999"
          {...props}
        />
        {/* 3. Icon bên phải (nếu có) */}
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress}>
            <Ionicons name={rightIcon} size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F222A',
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor: 'transparent', 
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#1F222A',
  },
});

export default CustomInput;