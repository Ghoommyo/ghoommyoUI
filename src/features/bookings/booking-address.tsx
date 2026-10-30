import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SavedAddress, StoreProfile } from '@/types/domain';
import { useT } from '@/i18n/language-provider';

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
  const { t } = useT();
  const theme = useTheme();
  const place = [[profile.city, profile.pin].filter(Boolean).join(' '), profile.country].filter(Boolean).join(', ');
  return (
    <View
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}
      accessibilityLabel={t('booking.storeAddress')}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {t('booking.storeAddress')}
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
            {t('book.openInMaps')}
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
  const { t } = useT();
  const label = isHomeVisit ? t('book.visitAddress') : t('book.deliveryAddress');
  const isOther = choice === OTHER_ADDRESS;
  return (
    <View style={styles.field}>
      {loading || saved.length ? (
        <Select
          label={label}
          placeholder={loading ? t('book.loadingAddresses') : undefined}
          value={loading ? undefined : choice}
          options={[
            ...saved.map((address) => ({ label: addressOptionLabel(address), value: address.id })),
            { label: t('book.otherAddress'), value: OTHER_ADDRESS },
          ]}
          onChange={onChoice}
          error={isOther ? undefined : error}
        />
      ) : null}
      {!loading && isOther ? (
        <>
          <TextField
            label={saved.length ? t('book.address') : label}
            value={other}
            onChangeText={onOther}
            placeholder={t('book.addressPlaceholder')}
            error={error}
            multiline
          />
          <Checkbox label={t('book.saveAddress')} checked={save} onChange={onSave} />
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
