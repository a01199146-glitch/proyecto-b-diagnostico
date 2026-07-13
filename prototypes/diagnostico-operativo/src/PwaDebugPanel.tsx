import { useCallback, useEffect, useState } from "react";
import { readPwaDiagnostics, type PwaDiagnosticSnapshot } from "./pwaDiagnostics";

const yesNo = (value: boolean) => value ? "Sí" : "No";

export function PwaDebugPanel() {
  const enabled = import.meta.env.DEV || new URLSearchParams(window.location.search).get("pwa-debug") === "1";
  const [snapshot, setSnapshot] = useState<PwaDiagnosticSnapshot | null>(null);

  const refresh = useCallback(() => {
    void readPwaDiagnostics().then(setSnapshot);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    window.addEventListener("pwa-diagnostic-change", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    const interval = window.setInterval(refresh, 1500);
    return () => {
      window.removeEventListener("pwa-diagnostic-change", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.clearInterval(interval);
    };
  }, [enabled, refresh]);

  if (!enabled || !snapshot) return null;

  return <aside className="pwa-debug" aria-labelledby="pwa-debug-title">
    <div className="pwa-debug-heading">
      <div><p className="eyebrow">Diagnóstico técnico</p><h2 id="pwa-debug-title">Estado PWA</h2></div>
      <button type="button" onClick={refresh}>Actualizar</button>
    </div>
    <dl>
      <div><dt>Contexto seguro</dt><dd>{yesNo(snapshot.secureContext)}</dd></div>
      <div><dt>Service worker soportado</dt><dd>{yesNo(snapshot.serviceWorkerSupported)}</dd></div>
      <div><dt>Service worker registrado</dt><dd>{yesNo(snapshot.serviceWorkerRegistered)}</dd></div>
      <div><dt>Controlador activo</dt><dd>{yesNo(snapshot.serviceWorkerControlled)}</dd></div>
      <div><dt>Estado de red</dt><dd>{snapshot.online ? "En línea" : "Sin conexión"}</dd></div>
      <div><dt>Versión</dt><dd>{snapshot.appVersion}</dd></div>
      <div><dt>Base</dt><dd>{snapshot.basePath}</dd></div>
      <div><dt>Assets precacheados</dt><dd>{snapshot.cachedAssetCount ?? "No disponible"}</dd></div>
    </dl>
    {snapshot.registrationError && <p className="pwa-debug-error"><strong>Error de registro:</strong> {snapshot.registrationError}</p>}
    {!snapshot.secureContext && <p className="pwa-debug-warning">Este origen no es seguro. Usa HTTPS o localhost para activar el service worker.</p>}
  </aside>;
}
