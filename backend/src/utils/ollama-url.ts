import { execSync } from 'child_process';

let cachedGateway: string | null | undefined;

function getDockerGateway(): string | null {
  if (cachedGateway !== undefined) return cachedGateway;
  try {
    const route = execSync("ip route | grep default | awk '{print $3}'", {
      encoding: 'utf8',
      timeout: 1000
    });
    const ip = route.trim();
    cachedGateway = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip) ? ip : null;
  } catch {
    cachedGateway = null;
  }
  return cachedGateway;
}

/**
 * Resolves an Ollama URL for use inside a Docker container.
 * Replaces localhost/127.0.0.1 with the Docker bridge gateway IP
 * so the container can reach Ollama running on the host machine.
 */
export function resolveOllamaUrl(url: string): string {
  let resolved = url;
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1'
    ) {
      const gateway = getDockerGateway();
      parsed.hostname = gateway || 'host.docker.internal';
      resolved = parsed.toString();
    }
  } catch {
    // keep original URL if invalid
  }
  // Strip trailing slash so `${url}/api/chat` doesn't produce double slashes
  return resolved.replace(/\/$/, '');
}
