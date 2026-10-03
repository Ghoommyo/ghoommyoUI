import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { api, errorMessage } from '@/api';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import {
  AuthFormLayout,
  MIN_PASSWORD_LENGTH,
  ROLE_OPTIONS,
  validateEmail,
} from '@/features/auth/auth-form';
import type { Role } from '@/types/domain';

type FieldErrors = { email?: string; password?: string; confirm?: string; role?: string };

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<Role>();
  const [errors, setErrors] = useState<FieldErrors>({});

  const signup = useMutation({
    mutationFn: (selectedRole: Role) => api.signup({ email, password, role: selectedRole }),
    onSuccess: () => router.replace({ pathname: '/login', params: { registered: '1' } }),
  });

  const submit = () => {
    const next: FieldErrors = {
      email: validateEmail(email),
      password:
        password.length < MIN_PASSWORD_LENGTH
          ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
          : undefined,
      confirm: confirm !== password ? 'Passwords do not match.' : undefined,
      role: role ? undefined : 'Choose an account type.',
    };
    setErrors(next);
    if (role && !Object.values(next).some(Boolean)) signup.mutate(role);
  };

  return (
    <AuthFormLayout
      title="Sign up"
      footerText="Already a member?"
      footerLinkText="Click to login"
      footerHref="/login">
      <Banner
        message={signup.isError ? { type: 'error', text: errorMessage(signup.error) } : null}
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={submit}
      />
      <Select
        label="Type"
        placeholder="User or store"
        value={role}
        options={ROLE_OPTIONS}
        onChange={(value) => {
          setRole(value);
          setErrors((e) => ({ ...e, role: undefined }));
        }}
        error={errors.role}
      />
      <Button label="Sign up" onPress={submit} loading={signup.isPending} fullWidth />
    </AuthFormLayout>
  );
}
