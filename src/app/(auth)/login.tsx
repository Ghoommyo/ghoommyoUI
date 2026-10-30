import { useMutation } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { api, errorMessage } from '@/api';
import { useSession } from '@/auth/session';
import { ThemedText } from '@/components/themed-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { AuthFormLayout, roleOptions, validateEmail } from '@/features/auth/auth-form';
import type { Credentials, Role } from '@/types/domain';
import { useT } from '@/i18n/language-provider';

export default function LoginScreen() {
  const { t } = useT();
  const { signIn } = useSession();
  // Set by signup (and forgot password): show a confirmation and, for stores, prefill the store name.
  const params = useLocalSearchParams<{ registered?: string; passwordReset?: string; role?: Role; store?: string }>();
  const [role, setRole] = useState<Role>(params.role === 'store' ? 'store' : 'user');
  const [identifier, setIdentifier] = useState(params.store ?? '');
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
          : t('auth.enterEmailOrStore')
        : validateEmail(identifier, t),
      password: password ? undefined : t('auth.passwordRequired'),
    };
    setErrors(next);
    if (next.identifier || next.password) return;
    login.mutate(
      isStore
        ? { role: 'store', login: identifier.trim(), password }
        : { role: 'user', email: identifier.trim(), password },
    );
  };

  const registeredText =
    params.role === 'store'
      ? t('auth.storeCreated')
      : t('auth.userCreated');

  return (
    <AuthFormLayout
      title={t('auth.login')}
      footerText={t('auth.notMember')}
      footerLinkText={t('auth.toSignup')}
      footerHref="/signup">
      <Banner
        message={
          login.isError
            ? { type: 'error', text: errorMessage(login.error) }
            : params.registered
              ? { type: 'success', text: registeredText }
              : params.passwordReset
                ? { type: 'success', text: t('auth.passwordChanged') }
                : null
        }
      />
      <Select
        label={t('auth.type')}
        value={role}
        options={roleOptions(t)}
        onChange={(value) => {
          // Users log in by email only; don't carry a store name over (or vice versa).
          if (value !== role) setIdentifier('');
          setRole(value);
          setErrors({});
          login.reset();
        }}
      />
      {isStore ? (
        <TextField
          label={t('auth.emailOrStore')}
          value={identifier}
          onChangeText={setIdentifier}
          error={errors.identifier}
          placeholder={t('auth.emailOrStorePlaceholder')}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
        />
      ) : (
        <TextField
          label={t('auth.email')}
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
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={submit}
      />
      <Link href={{ pathname: '/forgot-password', params: { role } }} style={styles.forgot}>
        <ThemedText type="linkPrimary">{t('auth.forgot')}</ThemedText>
      </Link>
      <Button label={t('auth.login')} onPress={submit} loading={login.isPending} fullWidth />
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  forgot: {
    alignSelf: 'flex-end',
  },
});
