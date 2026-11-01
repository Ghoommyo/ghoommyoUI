import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { api, errorMessage } from '@/api';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { TextField } from '@/components/ui/text-field';
import { EmailVerifyField } from '@/features/auth/email-verify-field';
import {
  AuthFormLayout,
  MIN_PASSWORD_LENGTH,
  roleOptions,
  validateEmail,
  validateUsername,
} from '@/features/auth/auth-form';
import { normalizeStoreName, storeKey, validateStoreName } from '@/lib/store-name';
import type { Role, SignupInput } from '@/types/domain';
import { useT } from '@/i18n/language-provider';

type FieldErrors = {
  role?: string;
  username?: string;
  locationName?: string;
  email?: string;
  password?: string;
  confirm?: string;
};

export default function SignupScreen() {
  const { t } = useT();
  const [role, setRole] = useState<Role>();
  const [username, setUsername] = useState('');
  const [locationName, setLocationName] = useState('');
  const [email, setEmail] = useState('');
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
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
      role: role ? undefined : t('auth.chooseType'),
      username: role === 'user' ? validateUsername(username, t) : undefined,
      locationName: isStore ? validateStoreName(locationName, t) : undefined,
      email: validateEmail(email, t) ?? (verificationToken ? undefined : t('auth.verifyFirst')),
      password:
        password.length < MIN_PASSWORD_LENGTH
          ? t('auth.passwordLength', { count: MIN_PASSWORD_LENGTH })
          : undefined,
      confirm: confirm !== password ? t('auth.passwordsDiffer') : undefined,
    };
    setErrors(next);
    if (!role || !verificationToken || Object.values(next).some(Boolean)) return;
    signup.mutate(
      role === 'store'
        ? { role: 'store', locationName: normalizeStoreName(locationName), email: email.trim(), password, verificationToken }
        : { role: 'user', username: username.trim(), email: email.trim(), password, verificationToken },
    );
  };

  return (
    <AuthFormLayout
      title={t('auth.signup')}
      footerText={t('auth.alreadyMember')}
      footerLinkText={t('auth.toLogin')}
      footerHref="/login">
      <Banner
        message={signup.isError ? { type: 'error', text: errorMessage(signup.error) } : null}
      />
      <Select
        label={t('auth.type')}
        placeholder={t('auth.typePlaceholder')}
        value={role}
        options={roleOptions(t)}
        onChange={(value) => {
          // A verified email is tied to the account type.
          if (value !== role) setVerificationToken(null);
          setRole(value);
          setErrors((e) => ({ ...e, role: undefined }));
        }}
        error={errors.role}
      />
      {isStore ? (
        <TextField
          label={t('auth.storeName')}
          value={locationName}
          onChangeText={(value) => {
            setLocationName(value);
            setErrors((e) => ({ ...e, locationName: undefined }));
          }}
          onBlur={() =>
            locationName && setErrors((e) => ({ ...e, locationName: validateStoreName(locationName, t) }))
          }
          error={errors.locationName}
          hint={
            locationName.trim()
              ? t('auth.storeNameSaved', { key: storeKey(locationName) })
              : t('auth.storeNameHint')
          }
          autoComplete="organization"
        />
      ) : role === 'user' ? (
        <TextField
          label={t('auth.username')}
          value={username}
          onChangeText={setUsername}
          error={errors.username}
          hint={t('auth.usernameHint')}
          autoComplete="username"
          textContentType="username"
        />
      ) : null}
      <EmailVerifyField
        key={role ?? 'none'}
        role={role}
        purpose="signup"
        email={email}
        onChangeEmail={(value) => {
          setEmail(value);
          setErrors((e) => ({ ...e, email: undefined }));
        }}
        token={verificationToken}
        onVerified={(token) => {
          setVerificationToken(token);
          setErrors((e) => ({ ...e, email: undefined }));
        }}
        error={errors.email}
      />
      <TextField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label={t('auth.confirmPassword')}
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={submit}
      />
      <Button label={t('auth.signup')} onPress={submit} loading={signup.isPending} fullWidth />
    </AuthFormLayout>
  );
}
