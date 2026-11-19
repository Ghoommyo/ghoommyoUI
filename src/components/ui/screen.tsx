import type { PropsWithChildren, RefObject } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { AdBanner } from '@/components/ui/ad-banner';
import { MaxContentWidth, Spacing } from '@/constants/theme';

/**
 * Scrollable, safe-area-aware page with centered content capped at MaxContentWidth. `ads` pins a banner
 * under it; `scrollRef` lets a form scroll to its first error.
 */
export function Screen({ children, ads, scrollRef }: PropsWithChildren<{ ads?: boolean; scrollRef?: RefObject<ScrollView | null> }>) {
  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
        {ads && <AdBanner />}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
});
