import { MessagingProvider } from "./types";
import { BhashSMSProvider } from "./bhashsms";

export * from "./types";

export function getMessagingProvider(_providerType?: string): MessagingProvider {
  return new BhashSMSProvider();
}
