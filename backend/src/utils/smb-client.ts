import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

export interface NtlmAuth {
  type: 'ntlm';
  domain?: string;
  username: string;
  password: string;
}

export interface KerberosAuth {
  type: 'kerberos';
  principal: string;
  keytabBase64?: string;
}

export type SmbAuth = NtlmAuth | KerberosAuth;

export interface SmbConnection {
  host: string;
  share: string;
  auth: SmbAuth;
}

// Write NTLM credentials to a temp file so the password never appears in process args.
async function withAuthFile<T>(auth: NtlmAuth, fn: (path: string) => Promise<T>): Promise<T> {
  const path = join(tmpdir(), `smb-auth-${randomBytes(8).toString('hex')}`);
  const lines = [`username = ${auth.username}`, `password = ${auth.password}`];
  if (auth.domain) lines.push(`domain = ${auth.domain}`);
  await fs.writeFile(path, lines.join('\n') + '\n', { mode: 0o600 });
  try {
    return await fn(path);
  } finally {
    await fs.unlink(path).catch(() => {});
  }
}

// Obtain a Kerberos TGT from a keytab and run fn with a per-call ccache path.
// If no keytab is provided, assumes a valid ticket already exists in the environment.
async function withKerberosTicket<T>(auth: KerberosAuth, fn: (ccache: string) => Promise<T>): Promise<T> {
  if (!auth.keytabBase64) {
    return fn('');
  }
  const id = randomBytes(8).toString('hex');
  const keytabPath = join(tmpdir(), `smb-kt-${id}`);
  const ccachePath = join(tmpdir(), `smb-cc-${id}`);
  await fs.writeFile(keytabPath, Buffer.from(auth.keytabBase64, 'base64'), { mode: 0o600 });
  try {
    await new Promise<void>((resolve, reject) => {
      const kinit = spawn('kinit', ['-kt', keytabPath, auth.principal], {
        env: { ...process.env, KRB5CCNAME: `FILE:${ccachePath}` },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stderr = '';
      kinit.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
      kinit.on('close', (code) => {
        if (code !== 0) reject(new Error(`kinit failed: ${stderr.trim()}`));
        else resolve();
      });
    });
    return await fn(ccachePath);
  } finally {
    await fs.unlink(keytabPath).catch(() => {});
    await fs.unlink(ccachePath).catch(() => {});
  }
}

function spawnSmbclient(
  conn: SmbConnection,
  command: string,
  authArgs: string[],
  extraEnv?: Record<string, string>,
  unsetEnv?: string[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [`//${conn.host}/${conn.share}`, '-m', 'SMB3', ...authArgs, '-c', command];
    const env = { ...process.env, ...extraEnv };
    for (const key of unsetEnv ?? []) delete env[key];
    const proc = spawn('smbclient', args, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      const combined = stdout + stderr;
      const statusMatch = combined.match(/NT_STATUS_\w+/);
      if (statusMatch) {
        reject(new Error(statusMatch[0]));
        return;
      }
      if (code !== 0) {
        reject(new Error((stderr || stdout).trim() || `smbclient exited with code ${code}`));
        return;
      }
      resolve(stdout);
    });
  });
}

export async function smbCommand(conn: SmbConnection, command: string): Promise<string> {
  if (conn.auth.type === 'ntlm') {
    return withAuthFile(conn.auth, (authFilePath) =>
      // Unset KRB5_CONFIG so smbclient uses NTLM and doesn't try Kerberos
      spawnSmbclient(conn, command, ['-A', authFilePath], undefined, ['KRB5_CONFIG'])
    );
  }
  return withKerberosTicket(conn.auth, (ccachePath) =>
    spawnSmbclient(
      conn,
      command,
      ['--use-kerberos=required'],
      ccachePath ? { KRB5CCNAME: `FILE:${ccachePath}` } : undefined
    )
  );
}

export async function smbDownload(conn: SmbConnection, remotePath: string): Promise<Buffer> {
  const tmpPath = join(tmpdir(), `smb-dl-${randomBytes(8).toString('hex')}`);
  const remote = remotePath.replace(/\//g, '\\');
  try {
    await smbCommand(conn, `get "${remote}" "${tmpPath}"`);
    return await fs.readFile(tmpPath);
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}

export async function smbUpload(conn: SmbConnection, remotePath: string, data: Buffer): Promise<void> {
  const tmpPath = join(tmpdir(), `smb-ul-${randomBytes(8).toString('hex')}`);
  const remote = remotePath.replace(/\//g, '\\');
  try {
    await fs.writeFile(tmpPath, data);
    await smbCommand(conn, `put "${tmpPath}" "${remote}"`);
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}

export function parseLsOutput(output: string): string[] {
  const files: string[] = [];
  for (const line of output.split('\n')) {
    // Format: "  <name>  <ATTRS>  <size>  <date>"
    // Attribute field is 1+ uppercase letters (D, A, H, S, R, N, etc.)
    const m = line.match(/^\s{2}(.+?)\s{2,}[A-Z]+\s+\d/);
    if (!m) continue;
    const name = m[1].trim();
    if (name === '.' || name === '..') continue;
    files.push(name);
  }
  return files;
}
