import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface Tab<K extends string> {
  key: K;
  label: string;
}

type SegmentedTabsProps<K extends string> = {
  tabs: Tab<K>[];
  value: K;
  onChange(key: K): void;
};

/** Underlined tab bar from the dashboard references; scrolls sideways on narrow screens. */
export function SegmentedTabs<K extends string>({ tabs, value, onChange }: SegmentedTabsProps<K>) {
  const theme = useTheme();

  return (
    <View style={[styles.wrapper, { borderBottomColor: theme.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {tabs.map((tab) => {
          const active = tab.key === value;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(tab.key)}
              style={[styles.tab, active && { borderBottomColor: theme.primary }]}>
              <ThemedText
                type={active ? 'smallBold' : 'small'}
                style={{ color: active ? theme.primary : theme.textSecondary, fontSize: 16 }}>
                {tab.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 2,
  },
  row: {
    flexGrow: 1,
  },
  tab: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginBottom: -2,
  },
});
