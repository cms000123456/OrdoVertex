import axios from 'axios';
import { getErrorMessage } from './error-helper';

export interface VaultConfig {
  url: string;
  token: string;
  namespace?: string;
  mountPath: string;
  secretPath: string;
}

export interface VaultSecret {
  [key: string]: unknown;
}

/**
 * Fetch a secret from HashiCorp Vault
 */
export async function getVaultSecret(config: VaultConfig): Promise<VaultSecret> {
  const { url, token, namespace, mountPath, secretPath } = config;
  
  // Clean up the URL and construct the API endpoint
  const baseUrl = url.replace(/\/$/, '');
  // Handle both kv v1 and v2
  const apiPath = mountPath.includes('kv') && !mountPath.includes('data')
    ? `/v1/${mountPath}/data/${secretPath}`
    : `/v1/${mountPath}/${secretPath}`;
  
  const headers: Record<string, string> = {
    'X-Vault-Token': token,
  };
  
  if (namespace) {
    headers['X-Vault-Namespace'] = namespace;
  }
  
  try {
    const response = await axios.get(`${baseUrl}${apiPath}`, {
      headers,
      timeout: 10000,
    });
    
    // Handle both KV v1 and v2 response formats
    const data = response.data?.data;
    if (data?.data && typeof data.data === 'object') {
      // KV v2 format: data.data contains the actual secret
      return data.data;
    }
    // KV v1 format: data contains the actual secret directly
    return data || {};
  } catch (error: unknown) {
    const err = error as Record<string, any>;
    if (err.response?.status === 404) {
      throw new Error(`Secret not found at path: ${mountPath}/${secretPath}`);
    }
    if (err.response?.status === 403) {
      throw new Error('Access denied: Invalid Vault token or insufficient permissions');
    }
    if (err.code === 'ECONNREFUSED') {
      throw new Error(`Cannot connect to Vault at ${url}`);
    }
    throw new Error(`Vault request failed: ${getErrorMessage(error)}`);
  }
}

/**
 * Validate Vault connection
 */
export async function validateVaultConnection(config: Omit<VaultConfig, 'mountPath' | 'secretPath'>): Promise<boolean> {
  const { url, token, namespace } = config;
  
  const headers: Record<string, string> = {
    'X-Vault-Token': token,
  };
  
  if (namespace) {
    headers['X-Vault-Namespace'] = namespace;
  }
  
  try {
    await axios.get(`${url.replace(/\/$/, '')}/v1/auth/token/lookup-self`, {
      headers,
      timeout: 5000,
    });
    return true;
  } catch (error) {
    return false;
  }
}
