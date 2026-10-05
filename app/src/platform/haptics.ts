/**
 * Haptik (docs/05 § Feedback, FR-X05): Android über `@capacitor/haptics`, sonst nichts.
 */
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export type HapticLevel = 'light' | 'medium' | 'heavy';

const STYLE: Record<HapticLevel, ImpactStyle> = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  heavy: ImpactStyle.Heavy,
};

export function haptic(level: HapticLevel): void {
  if (!Capacitor.isNativePlatform()) return;
  void Haptics.impact({ style: STYLE[level] }).catch(() => undefined);
}
