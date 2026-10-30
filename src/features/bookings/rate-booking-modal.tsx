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
import { useT } from '@/i18n/language-provider';

/** Rate a store for an accepted booking: 1–5 stars and an optional description. Mount only while open. */
export function RateBookingModal({ booking, onClose, onSaved }: { booking: Booking; onClose(): void; onSaved(): void }) {
  const { t, language } = useT();
  const rate = useRateBooking();
  const [stars, setStars] = useState(booking.rating?.stars ?? 0);
  const [review, setReview] = useState(booking.rating?.review ?? '');
  const [error, setError] = useState<string>();

  const submit = () => {
    if (!stars) {
      setError(t('rate.chooseRating'));
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
      title={booking.rating ? t('rate.editTitle') : t('rate.title', { store: booking.storeName })}
      onClose={onClose}
      footer={
        <View style={styles.actions}>
          <Button label={t('common.cancel')} variant="secondary" onPress={onClose} />
          <Button label={t('rate.submit')} variant="success" loading={rate.isPending} onPress={submit} />
        </View>
      }>
      <ThemedText type="small" themeColor="textSecondary">
        {booking.storeName} · {formatSlotStart(booking.slotStart, language)}
      </ThemedText>
      <Banner message={rate.isError ? { type: 'error', text: errorMessage(rate.error) } : null} />
      <StarInput
        label={t('rate.yourRating')}
        value={stars}
        onChange={(value) => {
          setStars(value);
          setError(undefined);
        }}
        error={error}
      />
      <TextField
        label={t('rate.description')}
        value={review}
        onChangeText={setReview}
        placeholder={t('rate.placeholder')}
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
