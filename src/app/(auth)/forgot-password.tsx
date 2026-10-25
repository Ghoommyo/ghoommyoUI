import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { api, errorMessage } from '@/api';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { AuthFormLayout, MIN_PASSWORD_LENGTH, ROLE_OPTIONS } from '@/features/auth/auth-form';
import { EmailVerifyField } from '@/features/auth/email-verify-field';
import type { PasswordReset, Role } from '@/types/domain';

/** Forgot password: email → emailed code → new password, then back to login. */
export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ role?: Role }>();
  const [role, setRole] = useState<Role>(params.role === 'store' ? 'store' : 'user');
  const [email, setEmail] = useState('');
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  const reset = useMutation({
    mutationFn: (input: PasswordReset) => api.resetPassword(input),
    onSuccess: () => router.replace({ pathname: '/login', params: { passwordReset: '1', role } }),
  });

  const submit = () => {
    const next = {
      password:
        password.length < MIN_PASSWORD_LENGTH
          ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
          : undefined,
      confirm: confirm !== password ? 'Passwords do not match.' : undefined,
    };
    setErrors(next);
    if (!verificationToken || next.password || next.confirm) return;
    reset.mutate({ role, verificationToken, password });
  };

  return (
    <AuthFormLayout
      title="Forgot password"
      footerText="Remembered it?"
      footerLinkText="Back to login"
      footerHref="/login">
      <Banner message={reset.isError ? { type: 'error', text: errorMessage(reset.error) } : null} />
      <Select
        label="Type"
        value={role}
        options={ROLE_OPTIONS}
        onChange={(value) => {
          if (value !== role) setVerificationToken(null);
          setRole(value);
        }}
      />
      <EmailVerifyField
        key={role}
        role={role}
        purpose="reset"
        email={email}
        onChangeEmail={setEmail}
        token={verificationToken}
        onVerified={setVerificationToken}
        sendLabel="Send code"
      />
      {verificationToken ? (
        <>
          <TextField
            label="New password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <TextField
            label="Confirm new password"
            value={confirm}
            onChangeText={setConfirm}
            error={errors.confirm}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={submit}
          />
          <Button label="Change password" onPress={submit} loading={reset.isPending} fullWidth />
        </>
      ) : null}
    </AuthFormLayout>
  );
}
