let activeBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? "https://lexicons-server.onrender.com" : "http://localhost:8787")
).replace(/\/$/, "");

// Probe promise to check if the local server is running.
// Resolves to the correct activeBaseUrl.
const probePromise = (async () => {
  const isLocal = activeBaseUrl.includes("localhost") || activeBaseUrl.includes("127.0.0.1") || activeBaseUrl.includes("::1");
  if (!import.meta.env.PROD && isLocal) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);
      const res = await fetch(`${activeBaseUrl}/api/health`, {
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        activeBaseUrl = "https://lexicons-server.onrender.com";
      }
    } catch {
      activeBaseUrl = "https://lexicons-server.onrender.com";
    }
  }
  return activeBaseUrl;
})();

export async function getApiUrl(path: string): Promise<string> {
  const baseUrl = await probePromise;
  return `${baseUrl}${path}`;
}
