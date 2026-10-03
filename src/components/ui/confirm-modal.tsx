import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// react-native-web can leave a fading modal stuck on screen if navigation happens mid-fade.
const MODAL_ANIMATION = Platform.OS === 'web' ? 'none' : 'fade';

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm(): void;
  onCancel(): void;
};

/** Replaces Alert.alert, which does nothing on web. */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType={MODAL_ANIMATION} onRequestClose={onCancel}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: theme.overlay }]}
        onPress={onCancel}
        accessibilityLabel={cancelLabel}>
        <Pressable
          accessibilityRole="alert"
          style={[styles.dialog, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="default" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {message}
          </ThemedText>
          <View style={styles.actions}>
            <Button label={cancelLabel} variant="secondary" onPress={onCancel} />
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  dialog: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontWeight: 700,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
});
