import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { DescriptionHistory } from '@/features/bookings/description-history';
import { useUpdateBooking } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { MESSAGE_SEPARATOR } from '@/lib/bookings';
import { formatSlotStart } from '@/lib/date';
import type { Booking, BookingChanges } from '@/types/domain';

const MOBILE_PATTERN = /^\+?\d{10,15}$/;

type EditBookingModalProps = {
  booking: Booking;
  /** Most people the store allows per booking. */
  maxPerBooking: number;
  /** Dark-store bookings are orders: no head count to change. */
  isDarkStore?: boolean;
  onClose(): void;
  onSaved(booking: Booking): void;
};

/**
 * The customer changes a pending/accepted booking: people, mobile, and a message added to the
 * description below a ===== line. The store is notified. Mount it only while open.
 */
export function EditBookingModal({ booking, maxPerBooking, isDarkStore, onClose, onSaved }: EditBookingModalProps) {
  const theme = useTheme();
  const update = useUpdateBooking();
  const [people, setPeople] = useState(booking.people);
  const [mobile, setMobile] = useState(booking.mobile);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ mobile?: string; form?: string }>({});

  const save = () => {
    const changes: BookingChanges = {};
    if (message.trim()) changes.message = message.trim();
    if (!isDarkStore && people !== booking.people) changes.people = people;
    if (mobile.trim() !== booking.mobile) changes.mobile = mobile.trim();
    const next = {
      mobile: MOBILE_PATTERN.test(mobile.replace(/[\s-]/g, '')) ? undefined : 'Enter a valid mobile number.',
      form: Object.keys(changes).length ? undefined : 'Nothing to save. Change something or write a message.',
    };
    setErrors(next);
    if (next.mobile || next.form) return;
    update.mutate({ bookingId: booking.id, changes }, { onSuccess: onSaved });
  };

  const peopleOptions = Array.from({ length: Math.max(maxPerBooking, booking.people) }, (_, i) => ({
    label: String(i + 1),
    value: i + 1,
  }));

  return (
    <Sheet
      visible
      title="Edit booking"
      onClose={onClose}
      footer={
        <View style={styles.actions}>
          <Button label="Cancel" variant="secondary" onPress={onClose} />
          <Button label="Save and notify store" variant="success" loading={update.isPending} onPress={save} />
        </View>
      }>
      <Banner
        message={
          update.isError
            ? { type: 'error', text: errorMessage(update.error) }
            : errors.form
              ? { type: 'error', text: errors.form }
              : null
        }
      />
      <View style={[styles.summary, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="smallBold">{booking.storeName}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatSlotStart(booking.slotStart)}
        </ThemedText>
      </View>

      {!isDarkStore ? (
        <Select
          label="How many people are coming"
          value={people}
          options={peopleOptions}
          onChange={(value) => {
            setPeople(value);
            setErrors({});
          }}
        />
      ) : null}
      <TextField
        label="Contact (mobile)"
        value={mobile}
        onChangeText={(value) => {
          setMobile(value);
          setErrors({});
        }}
        keyboardType="phone-pad"
        autoComplete="tel"
        error={errors.mobile}
      />

      <View style={styles.description}>
        <ThemedText type="smallBold">Description</ThemedText>
        <DescriptionHistory description={booking.description} />
        <View style={styles.separator} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.line, { backgroundColor: theme.border }]} />
          <ThemedText type="smallBold" themeColor="textSecondary">
            {MESSAGE_SEPARATOR}
          </ThemedText>
          <View style={[styles.line, { backgroundColor: theme.border }]} />
        </View>
        <TextField
          label="Add a message"
          value={message}
          onChangeText={(value) => {
            setMessage(value);
            setErrors({});
          }}
          placeholder="Anything you'd like to add for the store"
          hint="It's added below the line; the earlier text stays as it is."
          multiline
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  summary: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  description: {
    gap: Spacing.one,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginVertical: Spacing.one,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
});
