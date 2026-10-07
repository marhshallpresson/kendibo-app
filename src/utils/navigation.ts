import { router } from 'expo-router';

/**
 * Back navigation that never warns: if the stack has nothing to pop
 * (deep link, replaced auth chain, web refresh), fall back instead.
 */
export function goBack(fallback: string = '/(tabs)'): void {
  try {
    if (router.canGoBack()) {
      router.back();
      return;
    }
  } catch {
    /* fall through to fallback */
  }
  router.replace(fallback as never);
}
