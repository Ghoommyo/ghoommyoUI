import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SavedAddress, StoreProfile } from '@/types/domain';

/** The "Other…" choice in the delivery address list. */
export const OTHER_ADDRESS = '__other__';

/** "Home — 12 MG Road, Indore" (the label only when set; long addresses are cut). */
export function addressOptionLabel(address: SavedAddress): string {
  const text = address.address.replace(/\s+/g, ' ');
  const short = text.length > 60 ? `${text.slice(0, 57)}…` : text;
  return address.label ? `${address.label} — ${short}` : short;
}

/** Where the customer goes for Book table / Pickup / Book appointment. */
export function StoreAddressCard({ storeName, profile }: { storeName: string; profile: StoreProfile }) {
  const theme = useTheme();
  const place = [[profile.city, profile.pin].filter(Boolean).join(' '), profile.country].filter(Boolean).join(', ');
  return (
    <View
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}
      accessibilityLabel="Store address">
      <ThemedText type="smallBold" themeColor="textSecondary">
        Store address
      </ThemedText>
      <ThemedText type="smallBold">{storeName}</ThemedText>
      <ThemedText>{profile.address}</ThemedText>
      {place ? <ThemedText themeColor="textSecondary">{place}</ThemedText> : null}
      {profile.mapUrl ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => Linking.openURL(profile.mapUrl!)}
          hitSlop={8}
          style={styles.link}>
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            Open in maps
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

type DeliveryAddressFieldProps = {
  /** Porter or Book home visit: the wording of the label. */
  isHomeVisit: boolean;
  saved: SavedAddress[];
  loading: boolean;
  /** A saved address id or `OTHER_ADDRESS`. */
  choice: string;
  onChoice(choice: string): void;
  other: string;
  onOther(text: string): void;
  save: boolean;
  onSave(save: boolean): void;
  error?: string;
};

/** Where the store goes: a saved address, or Other with a text box and "Save this address". */
export function DeliveryAddressField({
  isHomeVisit,
  saved,
  loading,
  choice,
  onChoice,
  other,
  onOther,
  save,
  onSave,
  error,
}: DeliveryAddressFieldProps) {
  const label = isHomeVisit ? 'Visit address' : 'Delivery address';
  const isOther = choice === OTHER_ADDRESS;
  return (
    <View style={styles.field}>
      {loading || saved.length ? (
        <Select
          label={label}
          placeholder={loading ? 'Loading your addresses…' : undefined}
          value={loading ? undefined : choice}
          options={[
            ...saved.map((address) => ({ label: addressOptionLabel(address), value: address.id })),
            { label: 'Other…', value: OTHER_ADDRESS },
          ]}
          onChange={onChoice}
          error={isOther ? undefined : error}
        />
      ) : null}
      {!loading && isOther ? (
        <>
          <TextField
            label={saved.length ? 'Address' : label}
            value={other}
            onChangeText={onOther}
            placeholder="House or flat, street, area, city, PIN code"
            error={error}
            multiline
          />
          <Checkbox label="Save this address" checked={save} onChange={onSave} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  link: {
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
  },
  field: {
    gap: Spacing.two,
  },
});
