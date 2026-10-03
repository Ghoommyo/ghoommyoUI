import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { api, errorMessage } from '@/api';
import { useSession } from '@/auth/session';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { AuthFormLayout, ROLE_OPTIONS, validateEmail } from '@/features/auth/auth-form';
import type { Credentials, Role } from '@/types/domain';

export default function LoginScreen() {
  const { signIn } = useSession();
  // Set by signup: show a confirmation and, for stores, prefill the issued login code.
  const params = useLocalSearchParams<{ registered?: string; role?: Role; code?: string }>();
  const [role, setRole] = useState<Role>(params.role === 'store' ? 'store' : 'user');
  const [identifier, setIdentifier] = useState(params.code ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const isStore = role === 'store';

  const login = useMutation({
    mutationFn: (credentials: Credentials) => api.login(credentials),
    onSuccess: async (session) => {
      await signIn(session);
      router.replace('/dashboard');
    },
  });

  const submit = () => {
    const next = {
      identifier: isStore
        ? identifier.trim()
          ? undefined
          : 'Location code is required.'
        : validateEmail(identifier),
      password: password ? undefined : 'Password is required.',
    };
    setErrors(next);
    if (next.identifier || next.password) return;
    login.mutate(
      isStore
        ? { role: 'store', locationCode: identifier.trim(), password }
        : { role: 'user', email: identifier.trim(), password },
    );
  };

  const registeredText = params.code
    ? `Account created. Your login code is "${params.code}".`
    : 'Account created. Please log in.';

  return (
    <AuthFormLayout
      title="Login"
      footerText="Not a member?"
      footerLinkText="Click to signup"
      footerHref="/signup">
      <Banner
        message={
          login.isError
            ? { type: 'error', text: errorMessage(login.error) }
            : params.registered
              ? { type: 'success', text: registeredText }
              : null
        }
      />
      <Select
        label="Type"
        value={role}
        options={ROLE_OPTIONS}
        onChange={(value) => {
          // Email and location code are different identifiers; don't carry one into the other.
          if (value !== role) setIdentifier('');
          setRole(value);
          setErrors({});
          login.reset();
        }}
      />
      {isStore ? (
        <TextField
          label="Location code"
          value={identifier}
          onChangeText={setIdentifier}
          error={errors.identifier}
          placeholder="e.g. raju_tailor"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
        />
      ) : (
        <TextField
          label="Email"
          value={identifier}
          onChangeText={setIdentifier}
          error={errors.identifier}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
      )}
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={submit}
      />
      <Button label="Login" onPress={submit} loading={login.isPending} fullWidth />
    </AuthFormLayout>
  );
}
