import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { useStore } from '@/data/useStore';
import { L } from '@/i18n/labels';
import { useTheme, THEME_ORDER, type ThemeName } from '../shared/useTheme';

const THEME_LABEL: Record<ThemeName, string> = {
  day: L.themeDay,
  sun: L.themeSun,
  night: L.themeNight,
};

const UNIT_OPTIONS = [
  { value: 'kg', label: L.weightUnitKg },
  { value: 'hg', label: L.weightUnitHg },
];

/** Hai lựa chọn của riêng máy này: cân theo đơn vị nào, và nhìn màn hình kiểu nào. */
export function PreferencesCard() {
  const { data, updateSettings } = useStore();
  const { theme, setTheme } = useTheme();

  return (
    <Card title={L.displayModeTitle}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-2">{L.weightUnitTitle}</span>
          <Segmented
            label={L.weightUnitTitle}
            value={data.settings.defaultWeightUnit}
            options={UNIT_OPTIONS}
            onValueChange={(value) =>
              updateSettings({ defaultWeightUnit: value === 'hg' ? 'hg' : 'kg' })
            }
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-2">{L.displayModeTitle}</span>
          <Segmented
            label={L.themeSwitch}
            value={theme}
            options={THEME_ORDER.map((t) => ({ value: t, label: THEME_LABEL[t] }))}
            onValueChange={(value) => setTheme(value as ThemeName)}
          />
        </div>
      </div>
    </Card>
  );
}
