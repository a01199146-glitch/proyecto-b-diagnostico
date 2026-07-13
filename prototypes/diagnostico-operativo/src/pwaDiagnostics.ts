import { registerSW } from "virtual:pwa-register";

export interface PwaDiagnosticSnapshot {
  secureContext: boolean;
  serviceWorkerSupported: boolean;
  serviceWorkerRegistered: boolean;
  serviceWorkerControlled: boolean;
  online: boolean;
  appVersion: string;
  basePath: string;
  cachedAssetCount: number | null;
  registrationError: string | null;
}

const notifyDiagnosticChange = () => window.dispatchEvent(new Event("pwa-diagnostic-change"));

export function initializePwaRegistration(): void {
  if (!("serviceWorker" in navigator)) {
    window.__PWA_REGISTRATION_ERROR__ = "Service workers no disponibles en este origen.";
    notifyDiagnosticChange();
    return;
  }

  registerSW({
    immediate: true,
    onRegisteredSW: (_serviceWorkerUrl, registration) => {
      if (registration) window.__PWA_REGISTRATION__ = registration;
      window.__PWA_REGISTRATION_ERROR__ = undefined;
      notifyDiagnosticChange();
    },
    onRegisterError: (error) => {
      window.__PWA_REGISTRATION_ERROR__ = error instanceof Error ? error.message : String(error);
      notifyDiagnosticChange();
    },
    onOfflineReady: notifyDiagnosticChange,
    onNeedRefresh: notifyDiagnosticChange
  });

  navigator.serviceWorker.addEventListener("controllerchange", notifyDiagnosticChange);
}

async function countPrecachedAssets(): Promise<number | null> {
  if (!("caches" in window)) return null;
  const cacheNames = (await caches.keys()).filter((name) => name.includes("precache"));
  if (!cacheNames.length) return 0;
  const requests = await Promise.all(cacheNames.map(async (name) => (await caches.open(name)).keys()));
  return new Set(requests.flat().map((request) => request.url)).size;
}

export async function readPwaDiagnostics(): Promise<PwaDiagnosticSnapshot> {
  const serviceWorkerSupported = "serviceWorker" in navigator;
  let serviceWorkerRegistered = false;

  if (serviceWorkerSupported) {
    try {
      serviceWorkerRegistered = (await navigator.serviceWorker.getRegistrations()).length > 0;
    } catch (error) {
      window.__PWA_REGISTRATION_ERROR__ = error instanceof Error ? error.message : String(error);
    }
  }

  let cachedAssetCount: number | null = null;
  try {
    cachedAssetCount = await countPrecachedAssets();
  } catch (error) {
    window.__PWA_REGISTRATION_ERROR__ = error instanceof Error ? error.message : String(error);
  }

  return {
    secureContext: window.isSecureContext,
    serviceWorkerSupported,
    serviceWorkerRegistered,
    serviceWorkerControlled: Boolean(navigator.serviceWorker?.controller),
    online: navigator.onLine,
    appVersion: __APP_VERSION__,
    basePath: import.meta.env.BASE_URL,
    cachedAssetCount,
    registrationError: window.__PWA_REGISTRATION_ERROR__ ?? null
  };
}
