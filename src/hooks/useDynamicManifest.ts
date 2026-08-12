import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useDynamicManifest() {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Determine manifest URL based on active pathname
    let manifestHref = "/site.webmanifest";
    if (location.pathname.startsWith("/restaurant")) {
      manifestHref = "/api/manifest/restaurant";
    } else if (
      location.pathname.startsWith("/staff") ||
      location.pathname.startsWith("/kitchen") ||
      location.pathname.startsWith("/waiter")
    ) {
      manifestHref = "/api/manifest/staff";
    }

    // Find or create dynamic manifest link tag in head
    let linkTag = document.getElementById("dynamic-manifest-link") as HTMLLinkElement | null;
    if (!linkTag) {
      linkTag = document.querySelector("link[rel='manifest']");
      if (linkTag) {
        linkTag.id = "dynamic-manifest-link";
      }
    }

    if (linkTag) {
      linkTag.href = manifestHref;
    } else {
      const newLink = document.createElement("link");
      newLink.id = "dynamic-manifest-link";
      newLink.rel = "manifest";
      newLink.href = manifestHref;
      document.head.appendChild(newLink);
    }
  }, [location.pathname]);

  useEffect(() => {
    // Listen for PWA beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Check display mode
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsInstalled(isStandalone);

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return {
    canInstall: Boolean(deferredPrompt),
    isInstalled,
    installApp,
  };
}
