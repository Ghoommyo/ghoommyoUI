import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// react-native-web can leave an animating modal stuck on screen if navigation happens mid-animation.
const ANIMATION = Platform.OS === 'web' ? 'none' : 'slide';
const WIDE = 640;

type SheetProps = {
  visible: boolean;
  title: string;
  onClose(): void;
  /** Stays put at the bottom while the body scrolls (e.g. Save / Cancel). */
  footer?: ReactNode;
  /** Extra controls in the header, before the close button (e.g. Refresh). */
  headerAction?: ReactNode;
  /** `sheet`: bottom sheet on phones, centred dialog when wide. `panel`: full-height panel from the right. */
  variant?: 'sheet' | 'panel';
  children: ReactNode;
};

/** Modal with a title, a close button, a scrolling body and an optional fixed footer. */
export function Sheet({ visible, title, onClose, footer, headerAction, variant = 'sheet', children }: SheetProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const containerStyle =
    variant === 'panel'
      ? [styles.panel, { width: Math.min(420, width * 0.92) }]
      : wide
        ? styles.dialog
        : styles.bottomSheet;

  return (
    <Modal visible={visible} transparent animationType={ANIMATION} onRequestClose={onClose}>
      <View
        style={[
          styles.backdrop,
          { backgroundColor: theme.overlay },
          variant === 'panel' ? styles.alignEnd : wide ? styles.alignCenter : styles.alignBottom,
        ]}>
        {/* Tapping outside the sheet closes it. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[containerStyle, { backgroundColor: theme.backgroundElement }]}>
          <SafeAreaView edges={variant === 'panel' ? ['top', 'bottom', 'right'] : ['bottom']} style={styles.fill}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <ThemedText type="default" style={styles.title} numberOfLines={1} accessibilityRole="header">
                {title}
              </ThemedText>
              {headerAction}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                hitSlop={8}
                style={({ pressed }) => [styles.close, pressed && { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="default" themeColor="textSecondary">
                  ✕
                </ThemedText>
              </Pressable>
            </View>
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
            {footer ? <View style={[styles.footer, { borderTopColor: theme.border }]}>{footer}</View> : null}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  alignBottom: {
    justifyContent: 'flex-end',
  },
  alignCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  alignEnd: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    maxHeight: '92%',
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    overflow: 'hidden',
  },
  dialog: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '85%',
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  panel: {
    height: '100%',
  },
  fill: {
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    flex: 1,
    fontWeight: 700,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexShrink: 1,
  },
  bodyContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  footer: {
    padding: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
