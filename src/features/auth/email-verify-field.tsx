import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, errorMessage } from '@/api';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { validateEmail } from '@/features/auth/auth-form';
import type { CodePurpose, EmailCodeSent, Role } from '@/types/domain';

/** Matches the server's wait between codes. */
const RESEND_SECONDS = 60;

type EmailVerifyFieldProps = {
  /** Codes are per account type; nothing is sent until one is chosen. */
  role: Role | undefined;
  purpose: CodePurpose;
  email: string;
  onChangeEmail(email: string): void;
  /** The verification token once the code was right, otherwise null. */
  token: string | null;
  onVerified(token: string | null): void;
  /** An error from the form, e.g. when it's submitted before verifying. */
  error?: string;
  /** The button beside the email: "Verify" at signup, "Send code" for a reset. */
  sendLabel?: string;
};

/**
 * An Email field with a button beside it that emails a 6-digit code, then a Code field to enter it.
 * A right code gives the token that signup or a password reset sends; the email locks until Change.
 */
export function EmailVerifyField({
  role,
  purpose,
  email,
  onChangeEmail,
  token,
  onVerified,
  error,
  sendLabel = 'Verify',
}: EmailVerifyFieldProps) {
  const [sent, setSent] = useState<EmailCodeSent | null>(null);
  const [code, setCode] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [codeError, setCodeError] = useState<string>();
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const send = useMutation({
    mutationFn: () => api.sendEmailCode({ email: email.trim(), purpose, role: role! }),
    onSuccess: (result) => {
      setSent(result);
      setCode('');
      setCodeError(undefined);
      setWait(RESEND_SECONDS);
    },
    onError: (err) => {
      const message = errorMessage(err);
      setEmailError(message);
      const seconds = /(\d+) seconds/.exec(message);
      if (seconds) setWait(Number(seconds[1]));
    },
  });

  const verify = useMutation({
    mutationFn: () => api.verifyEmailCode({ email: email.trim(), purpose, role: role!, code }),
    onSuccess: (verificationToken) => {
      setSent(null);
      setCode('');
      onVerified(verificationToken);
    },
    onError: (err) => setCodeError(errorMessage(err)),
  });

  const requestCode = () => {
    const problem = role ? validateEmail(email) : 'Choose an account type first.';
    setEmailError(problem);
    if (!problem) send.mutate();
  };

  const confirm = () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setCodeError('Enter the 6-digit code from the email.');
      return;
    }
    verify.mutate();
  };

  const change = () => {
    onVerified(null);
    setSent(null);
    setCode('');
    setEmailError(undefined);
  };

  const resendLabel = wait > 0 ? `Resend in ${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, '0')}` : 'Resend';

  return (
    <View style={styles.group}>
      <TextField
        label="Email"
        value={email}
        onChangeText={(value) => {
          onChangeEmail(value);
          // A code belongs to the email it was sent to.
          if (sent) setSent(null);
          setEmailError(undefined);
        }}
        editable={!token}
        // The form's "verify first" error is answered once a code is on its way.
        error={emailError ?? (sent ? undefined : error)}
        hint={token ? '✓ Email verified' : undefined}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        accessory={
          token ? (
            <Button label="Change" variant="secondary" onPress={change} accessibilityLabel="Change email" />
          ) : (
            <Button
              label={sent ? resendLabel : sendLabel}
              variant={sent ? 'secondary' : 'primary'}
              onPress={requestCode}
              loading={send.isPending}
              disabled={wait > 0}
              accessibilityLabel={sent ? 'Resend code' : `${sendLabel} email`}
            />
          )
        }
      />
      {sent && !token ? (
        <TextField
          label="Code"
          value={code}
          onChangeText={(value) => {
            setCode(value.replace(/\D/g, '').slice(0, 6));
            setCodeError(undefined);
          }}
          error={codeError}
          hint={
            sent.devCode
              ? `Test server: the code is ${sent.devCode}.`
              : purpose === 'reset'
                ? `${sent.message} It expires in 10 minutes.`
                : `We sent a 6-digit code to ${email.trim()}. It expires in 10 minutes.`
          }
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          onSubmitEditing={confirm}
          accessory={<Button label="Confirm" onPress={confirm} loading={verify.isPending} accessibilityLabel="Confirm code" />}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.three,
  },
});
