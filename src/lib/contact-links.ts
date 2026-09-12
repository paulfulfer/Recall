import { Linking } from "react-native";

// Spec section 6: try the app deep link first, fall back to web. Handles are stored bare
// (no full URL); a leading "@" on Instagram handles is stripped here, not at storage time.
async function openWithFallback(appUrl: string, webUrl: string) {
  const canOpenApp = await Linking.canOpenURL(appUrl);
  await Linking.openURL(canOpenApp ? appUrl : webUrl);
}

export function openPhone(number: string) {
  return Linking.openURL(`tel:${number}`);
}

export function openEmail(address: string) {
  return Linking.openURL(`mailto:${address}`);
}

export function openInstagram(handle: string) {
  const clean = handle.replace(/^@/, "");
  return openWithFallback(`instagram://user?username=${clean}`, `https://instagram.com/${clean}`);
}

export function openLinkedIn(handle: string) {
  return openWithFallback(`linkedin://in/${handle}`, `https://linkedin.com/in/${handle}`);
}
