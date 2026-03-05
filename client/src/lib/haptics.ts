import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

type HapticIntensity = 'light' | 'medium';

export function triggerHaptic(intensity: HapticIntensity = 'light') {
  try {
    if (Capacitor.isNativePlatform()) {
      const style = intensity === 'light' ? ImpactStyle.Light : ImpactStyle.Medium;
      Haptics.impact({ style }).catch(() => {});
    } else if (navigator.vibrate) {
      navigator.vibrate(intensity === 'light' ? 15 : 40);
    }
  } catch (_) {
  }
}
