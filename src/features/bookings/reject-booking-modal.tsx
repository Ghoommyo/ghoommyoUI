import { useState } from 'react';

import { ConfirmModal } from '@/components/ui/confirm-modal';
import { TextField } from '@/components/ui/text-field';
import { useT } from '@/i18n/language-provider';

/** Longest reason a store can give; the customer sees it with the booking and in the notification. */
export const MAX_REJECT_REASON = 200;

type RejectBookingModalProps = {
  /** The customer's name, for the question. Null keeps the dialog closed. */
  customer: string | null;
  onConfirm(reason: string): void;
  onCancel(): void;
};

/** Asks before a store rejects a booking, with an optional reason for the customer (same as the website). */
export function RejectBookingModal({ customer, onConfirm, onCancel }: RejectBookingModalProps) {
  const { t } = useT();
  const [reason, setReason] = useState('');
  return (
    <ConfirmModal
      visible={customer !== null}
      title={t('reject.title')}
      message={t('reject.message', { name: customer || t('reject.theCustomer') })}
      confirmLabel={t('reject.confirm')}
      cancelLabel={t('reject.keep')}
      destructive
      onCancel={() => {
        setReason('');
        onCancel();
      }}
      onConfirm={() => {
        onConfirm(reason.trim());
        setReason('');
      }}>
      <TextField
        label={t('reject.reason')}
        value={reason}
        onChangeText={setReason}
        placeholder={t('reject.reasonPlaceholder')}
        hint={t('reject.reasonHint')}
        maxLength={MAX_REJECT_REASON}
        multiline
      />
    </ConfirmModal>
  );
}
