import React, {PropsWithChildren} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View} from 'react-native';
import {colors, radius, spacing} from '../theme/tokens';

export function ScreenHeader({eyebrow, title, subtitle}: {eyebrow?: string; title: string; subtitle?: string}) {
  return <View style={styles.header}>
    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>;
}

export function Card({children, style}: PropsWithChildren<{style?: object}>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({title, onPress, variant = 'primary', disabled, loading}: {title: string; onPress: () => void; variant?: 'primary'|'secondary'|'danger'; disabled?: boolean; loading?: boolean}) {
  return <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={onPress} style={({pressed}) => [styles.button, styles[`button_${variant}`], (pressed || disabled) && styles.buttonPressed]}>
    {loading ? <ActivityIndicator color={variant === 'primary' ? colors.background : colors.ink}/> : <Text style={[styles.buttonText, variant === 'primary' && styles.primaryText]}>{title}</Text>}
  </Pressable>;
}

export function Field({label, error, ...props}: TextInputProps & {label: string; error?: string}) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} style={[styles.input, error && styles.inputError]} {...props}/>{error ? <Text style={styles.error}>{error}</Text> : null}</View>;
}

export function StatusPill({label, tone = 'neutral'}: {label: string; tone?: 'good'|'warning'|'bad'|'neutral'}) {
  return <View style={[styles.pill, styles[`pill_${tone}`]]}><View style={[styles.dot, styles[`dot_${tone}`]]}/><Text style={styles.pillText}>{label}</Text></View>;
}

export const sharedStyles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.lg, paddingBottom: 120, gap: spacing.md},
  row: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  between: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  sectionTitle: {color: colors.ink, fontSize: 17, fontWeight: '700'},
  body: {color: colors.muted, fontSize: 14, lineHeight: 21},
  value: {color: colors.ink, fontSize: 16, fontWeight: '600'},
});

const styles = StyleSheet.create({
  header: {paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.xs},
  eyebrow: {color: colors.accent, fontSize: 11, letterSpacing: 1.6, fontWeight: '800'},
  title: {color: colors.ink, fontSize: 29, lineHeight: 35, fontWeight: '800', letterSpacing: -0.6},
  subtitle: {color: colors.muted, fontSize: 14, lineHeight: 20, maxWidth: 420},
  card: {backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm},
  button: {minHeight: 48, borderRadius: radius.sm, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1},
  button_primary: {backgroundColor: colors.accent, borderColor: colors.accent},
  button_secondary: {backgroundColor: colors.surfaceRaised, borderColor: colors.border},
  button_danger: {backgroundColor: '#351B22', borderColor: '#6B303B'},
  buttonPressed: {opacity: 0.65}, buttonText: {color: colors.ink, fontWeight: '800', fontSize: 14}, primaryText: {color: colors.background},
  field: {gap: 6}, label: {color: colors.muted, fontSize: 12, fontWeight: '700'},
  input: {minHeight: 48, color: colors.ink, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, fontSize: 15},
  inputError: {borderColor: colors.danger}, error: {color: colors.danger, fontSize: 12},
  pill: {alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 9, paddingVertical: 5},
  pill_good: {backgroundColor: colors.accentDim}, pill_warning: {backgroundColor: '#332819'}, pill_bad: {backgroundColor: '#351B22'}, pill_neutral: {backgroundColor: colors.surfaceRaised},
  dot: {width: 6, height: 6, borderRadius: 3}, dot_good: {backgroundColor: colors.accent}, dot_warning: {backgroundColor: colors.warning}, dot_bad: {backgroundColor: colors.danger}, dot_neutral: {backgroundColor: colors.muted},
  pillText: {color: colors.ink, fontSize: 11, fontWeight: '700'},
});
