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
import type { Role } from '@/types/domain';

export default function LoginScreen() {
  const { signIn } = useSession();
  const { registered } = useLocalSearchParams<{ registered?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const login = useMutation({
    mutationFn: () => api.login({ email, password, role }),
    onSuccess: async (session) => {
      await signIn(session);
      router.replace('/dashboard');
    },
  });

  const submit = () => {
    const next = {
      email: validateEmail(email),
      password: password ? undefined : 'Password is required.',
    };
    setErrors(next);
    if (!next.email && !next.password) login.mutate();
  };

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
            : registered
              ? { type: 'success', text: 'Account created. Please log in.' }
              : null
        }
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
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={submit}
      />
      <Select label="Type" value={role} options={ROLE_OPTIONS} onChange={setRole} />
      <Button label="Login" onPress={submit} loading={login.isPending} fullWidth />
    </AuthFormLayout>
  );
}
