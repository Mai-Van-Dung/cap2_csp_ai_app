import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TEAL  = '#2E7D8C';
const TEXT3 = '#94A3B8';

// ── Danh sách tab — thêm/bớt tab ở đây ──────────────────
export const TAB_ITEMS = [
  { key: 'Home',    label: 'Home',    icon: 'home'          },
  { key: 'Alerts',  label: 'Alerts',  icon: 'notifications' },
  { key: 'Camera',  label: 'Camera',  icon: 'videocam'      },
  { key: 'Profile', label: 'Profile', icon: 'person'        },
];

// ── Props ─────────────────────────────────────────────────
// navigation  — object navigation từ React Navigation
// activeTab   — key của tab đang active, ví dụ 'Home'
// requireAuth — (optional) hàm bảo vệ tab cần đăng nhập
export default function BottomNav({ navigation, activeTab, requireAuth }) {
  const handlePress = (key) => {
    if (requireAuth && key !== 'Home') {
      requireAuth(() => navigation.navigate(key));
    } else {
      navigation.navigate(key);
    }
  };

  return (
    <View style={styles.bottomNav}>
      {TAB_ITEMS.map(({ key, label, icon }) => {
        const active = activeTab === key;
        return (
          <TouchableOpacity
            key={key}
            style={styles.tabItem}
            onPress={() => handlePress(key)}
          >
            <View style={[styles.tabPill, active && styles.tabPillActive]}>
              <Ionicons
                name={active ? icon : `${icon}-outline`}
                size={22}
                color={active ? TEAL : TEXT3}
              />
            </View>
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopColor: '#E5E7EB',
    borderTopWidth: 1,
    height: 58,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabItem:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabPill: {
    width: 44, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  tabPillActive:  { backgroundColor: '#EEEFF2' },
  tabLabel:       { fontSize: 12, fontWeight: '700', color: TEXT3 },
  tabLabelActive: { color: TEAL },
});