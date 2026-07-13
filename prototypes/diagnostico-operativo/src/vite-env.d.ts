/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;

interface Window {
  __PWA_REGISTRATION_ERROR__?: string;
  __PWA_REGISTRATION__?: ServiceWorkerRegistration;
}
