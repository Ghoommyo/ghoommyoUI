import { Select } from '@/components/ui/select';
import { useT } from '@/i18n/language-provider';
import { LANGUAGES, type Language } from '@/i18n/languages';

/** English / हिन्दी / मराठी for this device; each name is written in its own language. */
export function LanguagePicker({ onChange }: { onChange?(language: Language): void }) {
  const { t, language, setLanguage } = useT();
  return (
    <Select
      label={t('common.language')}
      value={language}
      options={LANGUAGES.map(({ code, name }) => ({ value: code, label: name }))}
      onChange={(next) => {
        setLanguage(next);
        onChange?.(next);
      }}
    />
  );
}
