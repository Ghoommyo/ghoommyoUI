import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { StarInput } from '@/components/ui/stars';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useRateBooking } from '@/hooks/queries';
import { formatSlotStart } from '@/lib/date';
import type { Booking } from '@/types/domain';

/** Rate a store for an accepted booking: 1–5 stars and an optional description. Mount only while open. */
export function RateBookingModal({ booking, onClose, onSaved }: { booking: Booking; onClose(): void; onSaved(): void }) {
  const rate = useRateBooking();
  const [stars, setStars] = useState(booking.rating?.stars ?? 0);
  const [review, setReview] = useState(booking.rating?.review ?? '');
  const [error, setError] = useState<string>();

  const submit = () => {
    if (!stars) {
      setError('Choose a rating.');
      return;
    }
    rate.mutate(
      { bookingId: booking.id, storeId: booking.storeId, rating: { stars, review: review.trim() } },
      { onSuccess: onSaved },
    );
  };

  return (
    <Sheet
      visible
      title={booking.rating ? 'Edit your rating' : `Rate ${booking.storeName}`}
      onClose={onClose}
      footer={
        <View style={styles.actions}>
          <Button label="Cancel" variant="secondary" onPress={onClose} />
          <Button label="Submit rating" variant="success" loading={rate.isPending} onPress={submit} />
        </View>
      }>
      <ThemedText type="small" themeColor="textSecondary">
        {booking.storeName} · {formatSlotStart(booking.slotStart)}
      </ThemedText>
      <Banner message={rate.isError ? { type: 'error', text: errorMessage(rate.error) } : null} />
      <StarInput
        label="Your rating"
        value={stars}
        onChange={(value) => {
          setStars(value);
          setError(undefined);
        }}
        error={error}
      />
      <TextField
        label="Description (optional)"
        value={review}
        onChangeText={setReview}
        placeholder="What was good, what could be better?"
        multiline
      />
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
});
