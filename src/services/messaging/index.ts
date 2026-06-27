import { MessagingProvider } from "./types";
import { BhashSMSProvider } from "./bhashsms";
import { MetaProvider } from "./meta";

export * from "./types";

export function getMessagingProvider(providerType: string = "bhashsms"): MessagingProvider {
  switch (providerType.toLowerCase()) {
    case "meta":
      return new MetaProvider();
    case "bhashsms":
    default:
      return new BhashSMSProvider();
  }
}
