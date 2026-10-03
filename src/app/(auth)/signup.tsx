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
  validateUsername,
} from '@/features/auth/auth-form';
import { normalizeStoreName, storeKey, validateStoreName } from '@/lib/store-name';
import type { Role, SignupInput } from '@/types/domain';

type FieldErrors = {
  role?: string;
  username?: string;
  locationName?: string;
  email?: string;
  password?: string;
  confirm?: string;
};

export default function SignupScreen() {
  const [role, setRole] = useState<Role>();
  const [username, setUsername] = useState('');
  const [locationName, setLocationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const isStore = role === 'store';

  const signup = useMutation({
    mutationFn: (input: SignupInput) => api.signup(input),
    onSuccess: (result, input) =>
      router.replace({
        pathname: '/login',
        params: {
          registered: '1',
          role: input.role,
          ...(input.role === 'store' ? { store: input.locationName } : {}),
        },
      }),
  });

  const submit = () => {
    const next: FieldErrors = {
      role: role ? undefined : 'Choose an account type.',
      username: role === 'user' ? validateUsername(username) : undefined,
      locationName: isStore ? validateStoreName(locationName) : undefined,
      email: validateEmail(email),
      password:
        password.length < MIN_PASSWORD_LENGTH
          ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
          : undefined,
      confirm: confirm !== password ? 'Passwords do not match.' : undefined,
    };
    setErrors(next);
    if (!role || Object.values(next).some(Boolean)) return;
    signup.mutate(
      role === 'store'
        ? { role: 'store', locationName: normalizeStoreName(locationName), email: email.trim(), password }
        : { role: 'user', username: username.trim(), email: email.trim(), password },
    );
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
      {isStore ? (
        <TextField
          label="Store name"
          value={locationName}
          onChangeText={(value) => {
            setLocationName(value);
            setErrors((e) => ({ ...e, locationName: undefined }));
          }}
          onBlur={() =>
            locationName && setErrors((e) => ({ ...e, locationName: validateStoreName(locationName) }))
          }
          error={errors.locationName}
          hint={
            locationName.trim()
              ? `Must be unique. Saved as "${storeKey(locationName)}".`
              : 'Letters, numbers and spaces only. Must be unique.'
          }
          autoComplete="organization"
        />
      ) : role === 'user' ? (
        <TextField
          label="Username"
          value={username}
          onChangeText={setUsername}
          error={errors.username}
          hint="Shown on your bookings. Doesn't need to be unique."
          autoComplete="username"
          textContentType="username"
        />
      ) : null}
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
      <Button label="Sign up" onPress={submit} loading={signup.isPending} fullWidth />
    </AuthFormLayout>
  );
}
