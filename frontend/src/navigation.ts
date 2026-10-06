import { Platform } from "react-native";
import { router } from "expo-router";

/**
 * Universal safe back navigation for Web, Android, and iOS.
 *
 * 1. Checks if React Navigation has an active stack entry to go back to.
 * 2. On Web, if browser history exists, uses window.history.back() to return
 *    to the exact previous screen without triggering React Navigation's
 *    "The action 'GO_BACK' was not handled by any navigator" warning.
 * 3. Only if there is genuinely no prior screen (e.g. direct link in fresh tab),
 *    smoothly transitions to the context-aware fallback screen.
 */
export function safeBack(fallbackRoute: string = "/(tabs)/home") {
  // 1. Try React Navigation's native stack first
  try {
    if (router.canGoBack()) {
      router.back();
      return;
    }
  } catch {}

  // 2. On Web, leverage browser history if user navigated between pages
  if (Platform.OS === "web" && typeof window !== "undefined") {
    if (window.history && window.history.length > 1) {
      try {
        window.history.back();
        return;
      } catch {}
    }
  }

  // 3. Fallback when there is genuinely no previous history to return to
  if (fallbackRoute) {
    router.replace(fallbackRoute as any);
  } else {
    router.replace("/");
  }
}
