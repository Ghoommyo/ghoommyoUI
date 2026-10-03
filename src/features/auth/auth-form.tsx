import { Link, type Href } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/components/ui/brand';
import { Screen } from '@/components/ui/screen';
import type { SelectOption } from '@/components/ui/select';
import { Spacing } from '@/constants/theme';
import type { Role } from '@/types/domain';

export const ROLE_OPTIONS: SelectOption<Role>[] = [
  { label: 'User', value: 'user' },
  { label: 'Store', value: 'store' },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

export function validateEmail(email: string) {
  if (!email.trim()) return 'Email is required.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address.';
}

type AuthFormLayoutProps = PropsWithChildren<{
  title: string;
  footerText: string;
  footerLinkText: string;
  footerHref: Href;
}>;

/** Shared frame for the login and signup screens. */
export function AuthFormLayout({
  title,
  footerText,
  footerLinkText,
  footerHref,
  children,
}: AuthFormLayoutProps) {
  return (
    <Screen>
      <View style={styles.header}>
        <Brand />
        <ThemedText type="subtitle">{title}</ThemedText>
      </View>
      {children}
      <View style={styles.footer}>
        <ThemedText type="small" themeColor="textSecondary">
          {footerText}
        </ThemedText>
        <Link href={footerHref} replace>
          <ThemedText type="linkPrimary">{footerLinkText}</ThemedText>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.three,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
});
