import { Image, ImageStyle, StyleProp } from 'react-native';
import { useAppTheme } from '../../app/_layout';

const lightLogo = require('../../../assets/logo-light.png');
const darkLogo = require('../../../assets/logo-dark.png');

/**
 * Kendibo wordmark lockup — blue lockup on light, white lockup on dark.
 * Source: Mrs. Favour brand pack (Kedibo_BlueT / Kedibo_whiteT).
 */
export default function BrandLogo({
  width = 148,
  style,
}: {
  width?: number;
  style?: StyleProp<ImageStyle>;
}) {
  const { isDark } = useAppTheme();
  // Lockups are ~1024x700 → preserve aspect.
  const height = Math.round(width * 0.685);
  return (
    <Image
      source={isDark ? darkLogo : lightLogo}
      style={[{ width, height, resizeMode: 'contain' }, style]}
      accessibilityLabel="Kendibo"
    />
  );
}
