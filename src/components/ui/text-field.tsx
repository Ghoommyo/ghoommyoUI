import { useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/language-provider';

import { Button } from './button';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  /** Helper text under the field (hidden while an error is shown). */
  hint?: string;
  /** Shown right of the input, e.g. a button that acts on its value. */
  accessory?: ReactNode;
};

export function TextField({ label, error, hint, accessory, style, multiline, editable, secureTextEntry, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const { t } = useT();
  // Password fields get a Show / Hide button, unless they bring their own accessory.
  const [revealed, setRevealed] = useState(false);
  const side =
    accessory ??
    (secureTextEntry ? (
      <Button
        label={t(revealed ? 'common.hide' : 'common.show')}
        variant="secondary"
        accessibilityLabel={t('common.showPassword')}
        accessibilityState={{ checked: revealed }}
        onPress={() => setRevealed((r) => !r)}
      />
    ) : null);

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.row}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.textSecondary}
          multiline={multiline}
          editable={editable}
          style={[
            styles.input,
            multiline && styles.multiline,
            {
              color: theme.text,
              backgroundColor: theme.backgroundElement,
              borderColor: error ? theme.danger : theme.border,
            },
            editable === false && styles.readOnly,
            style,
          ]}
          {...rest}
          secureTextEntry={secureTextEntry && !revealed}
        />
        {side}
      </View>
      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 44,
  },
  readOnly: {
    opacity: 0.6,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
});
