import { NodeType } from '../../types';
import ldap from 'ldapjs';

export const ldapNode: NodeType = {
  name: 'ldap',
  displayName: 'LDAP',
  description: 'Interact with LDAP/Active Directory servers',
  icon: 'fa:address-book',
  category: 'Actions',
  version: 1,
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Input data for LDAP operation'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'LDAP operation result'
    }
  ],
  properties: [
    {
      name: 'useCredential',
      displayName: 'Use Credential',
      type: 'boolean',
      default: true,
      description: 'Use saved LDAP credentials'
    },
    {
      name: 'credentialId',
      displayName: 'LDAP Credential',
      type: 'resource',
      resourceType: 'credential',
      required: true,
      displayOptions: {
        show: {
          useCredential: [true]
        }
      }
    },
    {
      name: 'serverUrl',
      displayName: 'Server URL',
      type: 'string',
      default: 'ldap://localhost:389',
      placeholder: 'ldap://ad.example.com:389 or ldaps://ad.example.com:636',
      description: 'LDAP server URL',
      displayOptions: {
        show: {
          useCredential: [false]
        }
      }
    },
    {
      name: 'bindDn',
      displayName: 'Bind DN',
      type: 'string',
      default: '',
      placeholder: 'cn=admin,dc=example,dc=com',
      description: 'Distinguished name for binding',
      displayOptions: {
        show: {
          useCredential: [false]
        }
      }
    },
    {
      name: 'bindPassword',
      displayName: 'Password',
      type: 'string',
      description: 'Password for binding',
      displayOptions: {
        show: {
          useCredential: [false]
        }
      }
    },
    {
      name: 'useTls',
      displayName: 'Use TLS/SSL',
      type: 'boolean',
      default: false,
      description: 'Use TLS encryption (LDAPS)',
      displayOptions: {
        show: {
          useCredential: [false]
        }
      }
    },
    {
      name: 'tlsOptions',
      displayName: 'TLS Options',
      type: 'json',
      default: {},
      description: 'Additional TLS options (rejectUnauthorized, etc.)',
      displayOptions: {
        show: {
          useCredential: [false],
          useTls: [true]
        }
      }
    },
    {
      name: 'operation',
      displayName: 'Operation',
      type: 'options',
      options: [
        { name: 'Search', value: 'search' },
        { name: 'Authenticate (Bind)', value: 'bind' },
        { name: 'Add Entry', value: 'add' },
        { name: 'Modify Entry', value: 'modify' },
        { name: 'Delete Entry', value: 'delete' },
        { name: 'Compare', value: 'compare' },
        { name: 'Get Group Members', value: 'getGroupMembers' },
        { name: 'Add to Group', value: 'addToGroup' },
        { name: 'Remove from Group', value: 'removeFromGroup' },
        { name: 'Check Group Membership', value: 'isMemberOf' }
      ],
      default: 'search',
      description: 'LDAP operation to perform'
    },
    {
      name: 'baseDn',
      displayName: 'Base DN',
      type: 'string',
      default: 'dc=example,dc=com',
      description: 'Base distinguished name for operations'
    },
    {
      name: 'filter',
      displayName: 'Filter',
      type: 'string',
      default: '(objectClass=*)',
      placeholder: '(cn={{ $input.username }})',
      description: 'LDAP filter (RFC 4515 syntax)',
      displayOptions: {
        show: {
          operation: ['search', 'bind', 'getGroupMembers', 'isMemberOf']
        }
      }
    },
    {
      name: 'scope',
      displayName: 'Search Scope',
      type: 'options',
      options: [
        { name: 'Base', value: 'base' },
        { name: 'One Level', value: 'one' },
        { name: 'Subtree', value: 'sub' }
      ],
      default: 'sub',
      description: 'Search scope',
      displayOptions: {
        show: {
          operation: ['search']
        }
      }
    },
    {
      name: 'attributes',
      displayName: 'Attributes',
      type: 'json',
      default: [],
      description: 'Attributes to return (empty = all)',
      displayOptions: {
        show: {
          operation: ['search', 'getGroupMembers', 'isMemberOf']
        }
      }
    },
    {
      name: 'sizeLimit',
      displayName: 'Size Limit',
      type: 'number',
      default: 0,
      description: 'Maximum entries to return (0 = unlimited)',
      displayOptions: {
        show: {
          operation: ['search', 'getGroupMembers']
        }
      }
    },
    {
      name: 'entryDn',
      displayName: 'Entry DN',
      type: 'string',
      default: '{{ $input.dn }}',
      placeholder: 'cn=user,dc=example,dc=com',
      description: 'Distinguished name of the entry',
      displayOptions: {
        show: {
          operation: ['add', 'modify', 'delete', 'compare', 'addToGroup', 'removeFromGroup']
        }
      }
    },
    {
      name: 'entryAttributes',
      displayName: 'Entry Attributes',
      type: 'json',
      default: {
        cn: '{{ $input.username }}',
        sn: '{{ $input.lastName }}',
        objectClass: ['inetOrgPerson', 'organizationalPerson']
      },
      description: 'Attributes for new entry',
      displayOptions: {
        show: {
          operation: ['add']
        }
      }
    },
    {
      name: 'modifications',
      displayName: 'Modifications',
      type: 'json',
      default: [
        { operation: 'replace', attribute: 'mail', value: '{{ $input.email }}' }
      ],
      description: 'Array of {operation, attribute, value} modifications',
      displayOptions: {
        show: {
          operation: ['modify']
        }
      }
    },
    {
      name: 'attributeName',
      displayName: 'Attribute Name',
      type: 'string',
      default: 'userPassword',
      description: 'Attribute to compare',
      displayOptions: {
        show: {
          operation: ['compare']
        }
      }
    },
    {
      name: 'attributeValue',
      displayName: 'Attribute Value',
      type: 'string',
      default: '{{ $input.password }}',
      description: 'Value to compare against',
      displayOptions: {
        show: {
          operation: ['compare']
        }
      }
    },
    {
      name: 'groupDn',
      displayName: 'Group DN',
      type: 'string',
      default: '{{ $input.groupDn }}',
      placeholder: 'cn=admins,ou=groups,dc=example,dc=com',
      description: 'Distinguished name of the group',
      displayOptions: {
        show: {
          operation: ['addToGroup', 'removeFromGroup', 'isMemberOf']
        }
      }
    },
    {
      name: 'memberAttribute',
      displayName: 'Member Attribute',
      type: 'string',
      default: 'member',
      description: 'Group membership attribute name',
      displayOptions: {
        show: {
          operation: ['addToGroup', 'removeFromGroup', 'getGroupMembers', 'isMemberOf']
        }
      }
    },
    {
      name: 'timeout',
      displayName: 'Timeout (ms)',
      type: 'number',
      default: 10000,
      description: 'Operation timeout in milliseconds'
    }
  ],
  execute: async (context) => {
    const client = ldap.createClient({
      url: context.getNodeParameter('serverUrl', 'ldap://localhost:389') as string,
      timeout: context.getNodeParameter('timeout', 10000) as number,
      connectTimeout: context.getNodeParameter('timeout', 10000) as number,
    });

    try {
      const useCredential = context.getNodeParameter('useCredential', true) as boolean;
      let bindDn: string;
      let bindPassword: string;

      if (useCredential) {
        // Get credential from store
        const { PrismaClient } = await import('@prisma/client');
        const { decryptJSON } = await import('../../utils/encryption');
        const prisma = new PrismaClient();
        
        const credentialId = context.getNodeParameter('credentialId', '') as string;
        const credential = await prisma.credential.findFirst({
          where: { id: credentialId, userId: context.userId }
        });
        
        if (!credential) {
          throw new Error('LDAP credential not found');
        }
        
        const credData = decryptJSON(credential.data, credential.iv);
        bindDn = credData.bindDn || credData.username;
        bindPassword = credData.password;
        
        // Reconfigure client with credential URL
        client.destroy();
        const url = credData.url || credData.serverUrl || 'ldap://localhost:389';
      } else {
        bindDn = context.getNodeParameter('bindDn', '') as string;
        bindPassword = context.getNodeParameter('bindPassword', '') as string;
      }

      // Bind to LDAP server
      await new Promise<void>((resolve, reject) => {
        client.bind(bindDn, bindPassword, (err) => {
          if (err) reject(new Error(`Bind failed: ${err.message}`));
          else resolve();
        });
      });

      const operation = context.getNodeParameter('operation', 'search') as string;
      const baseDn = context.getNodeParameter('baseDn', '') as string;
      const items = context.getInputData();
      const item = items[0]?.json || {};

      // Helper to replace template variables
      // LDAP filter escaping to prevent injection
      const escapeLdapFilter = (str: string): string => {
        return str
          .replace(/\\/g, '\\5c')
          .replace(/\*/g, '\\2a')
          .replace(/\(/g, '\\28')
          .replace(/\)/g, '\\29')
          .replace(/\u0000/g, '\\00');
      };
      
      const replaceVars = (str: string): string => {
        return str.replace(/\{\{\s*\$input\.(\w+)\s*\}\}/g, (_, key) => {
          const value = item[key] || '';
          // Escape the value to prevent LDAP injection
          return escapeLdapFilter(String(value));
        });
      };

      let result: any;

      switch (operation) {
        case 'search': {
          let filter = context.getNodeParameter('filter', '(objectClass=*)') as string;
          
          // Basic validation to prevent LDAP injection in the filter template itself
          // Only allow alphanumeric, parentheses, =, *, &, |, !, ~, :, <, >, space, and underscore
          if (!/^[a-zA-Z0-9\s\(\)=\*\&\|\!~:<>_,\.\-]+$/.test(filter)) {
            throw new Error('Invalid characters in LDAP filter');
          }
          
          // Ensure balanced parentheses
          let depth = 0;
          for (const char of filter) {
            if (char === '(') depth++;
            if (char === ')') depth--;
            if (depth < 0) throw new Error('Unbalanced parentheses in filter');
          }
          if (depth !== 0) throw new Error('Unbalanced parentheses in filter');
          
          filter = replaceVars(filter);
          const scope = context.getNodeParameter('scope', 'sub') as ldap.SearchScope;
          const attributes = context.getNodeParameter('attributes', []) as string[];
          const sizeLimit = context.getNodeParameter('sizeLimit', 0) as number;

          const entries: any[] = [];

          await new Promise<void>((resolve, reject) => {
            const searchOptions: ldap.SearchOptions = {
              scope,
              attributes: attributes.length > 0 ? attributes : undefined,
              sizeLimit: sizeLimit > 0 ? sizeLimit : undefined
            };

            client.search(baseDn, filter, searchOptions, (err, res) => {
              if (err) {
                reject(new Error(`Search failed: ${err.message}`));
                return;
              }

              res.on('searchEntry', (entry) => {
                entries.push({
                  dn: entry.dn.toString(),
                  attributes: entry.pojo.attributes
                });
              });

              res.on('error', (err) => {
                reject(new Error(`Search error: ${err.message}`));
              });

              res.on('end', () => {
                resolve();
              });
            });
          });

          result = {
            count: entries.length,
            entries
          };
          break;
        }

        case 'bind': {
          // Authenticate user with provided credentials
          const filter = replaceVars(context.getNodeParameter('filter', '(uid={{ $input.username }})') as string);
          
          // First, find the user DN
          const userDn = await new Promise<string>((resolve, reject) => {
            client.search(baseDn, filter, { scope: 'sub' }, (err, res) => {
              if (err) {
                reject(new Error(`Search failed: ${err.message}`));
                return;
              }

              let foundDn: string | null = null;

              res.on('searchEntry', (entry) => {
                foundDn = entry.dn.toString();
              });

              res.on('error', (err) => {
                reject(new Error(`Search error: ${err.message}`));
              });

              res.on('end', () => {
                if (foundDn) resolve(foundDn);
                else reject(new Error('User not found'));
              });
            });
          });

          // Attempt bind with user credentials
          const userPassword = replaceVars('{{ $input.password }}');
          
          await new Promise<void>((resolve, reject) => {
            client.bind(userDn, userPassword, (err) => {
              if (err) reject(new Error('Authentication failed'));
              else resolve();
            });
          });

          result = {
            authenticated: true,
            userDn
          };
          break;
        }

        case 'add': {
          const entryDn = replaceVars(context.getNodeParameter('entryDn', '') as string);
          let entryAttributes = context.getNodeParameter('entryAttributes', {}) as Record<string, any>;

          // Replace template variables in attributes
          entryAttributes = JSON.parse(JSON.stringify(entryAttributes).replace(/\{\{\s*\$input\.(\w+)\s*\}\}/g, (_, key) => {
            return item[key] || '';
          }));

          await new Promise<void>((resolve, reject) => {
            client.add(entryDn, entryAttributes, (err) => {
              if (err) reject(new Error(`Add failed: ${err.message}`));
              else resolve();
            });
          });

          result = { success: true, dn: entryDn };
          break;
        }

        case 'modify': {
          const entryDn = replaceVars(context.getNodeParameter('entryDn', '') as string);
          const modifications = context.getNodeParameter('modifications', []) as Array<{
            operation: string;
            attribute: string;
            value: any;
          }>;

          const changes = modifications.map(mod => ({
            operation: mod.operation as ldap.ChangeOperation,
            modification: {
              [mod.attribute]: Array.isArray(mod.value) ? mod.value : [mod.value]
            }
          }));

          await new Promise<void>((resolve, reject) => {
            client.modify(entryDn, changes, (err) => {
              if (err) reject(new Error(`Modify failed: ${err.message}`));
              else resolve();
            });
          });

          result = { success: true, dn: entryDn, changes: modifications.length };
          break;
        }

        case 'delete': {
          const entryDn = replaceVars(context.getNodeParameter('entryDn', '') as string);

          await new Promise<void>((resolve, reject) => {
            client.del(entryDn, (err) => {
              if (err) reject(new Error(`Delete failed: ${err.message}`));
              else resolve();
            });
          });

          result = { success: true, dn: entryDn };
          break;
        }

        case 'compare': {
          const entryDn = replaceVars(context.getNodeParameter('entryDn', '') as string);
          const attributeName = context.getNodeParameter('attributeName', '') as string;
          const attributeValue = replaceVars(context.getNodeParameter('attributeValue', '') as string);

          const match = await new Promise<boolean>((resolve, reject) => {
            client.compare(entryDn, attributeName, attributeValue, (err, matched) => {
              if (err) reject(new Error(`Compare failed: ${err.message}`));
              else resolve(matched);
            });
          });

          result = { match, dn: entryDn, attribute: attributeName };
          break;
        }

        case 'getGroupMembers': {
          const filter = replaceVars(context.getNodeParameter('filter', '(objectClass=groupOfNames)') as string);
          const memberAttribute = context.getNodeParameter('memberAttribute', 'member') as string;
          const attributes = context.getNodeParameter('attributes', []) as string[];

          const groups: any[] = [];

          await new Promise<void>((resolve, reject) => {
            const searchOptions: ldap.SearchOptions = {
              scope: 'sub',
              attributes: attributes.length > 0 ? [...attributes, memberAttribute] : undefined
            };

            client.search(baseDn, filter, searchOptions, (err, res) => {
              if (err) {
                reject(new Error(`Search failed: ${err.message}`));
                return;
              }

              res.on('searchEntry', (entry) => {
                const attrs: any = {};
                entry.pojo.attributes.forEach((attr: any) => {
                  attrs[attr.type] = attr.values;
                });
                groups.push({
                  dn: entry.dn.toString(),
                  members: attrs[memberAttribute] || []
                });
              });

              res.on('error', (err) => {
                reject(new Error(`Search error: ${err.message}`));
              });

              res.on('end', () => {
                resolve();
              });
            });
          });

          result = {
            count: groups.length,
            groups
          };
          break;
        }

        case 'addToGroup':
        case 'removeFromGroup': {
          const groupDn = replaceVars(context.getNodeParameter('groupDn', '') as string);
          const entryDn = replaceVars(context.getNodeParameter('entryDn', '') as string);
          const memberAttribute = context.getNodeParameter('memberAttribute', 'member') as string;

          const change = {
            operation: operation === 'addToGroup' ? 'add' : 'delete' as ldap.ChangeOperation,
            modification: {
              [memberAttribute]: [entryDn]
            }
          };

          await new Promise<void>((resolve, reject) => {
            client.modify(groupDn, [change], (err) => {
              if (err) reject(new Error(`Group update failed: ${err.message}`));
              else resolve();
            });
          });

          result = {
            success: true,
            group: groupDn,
            member: entryDn,
            action: operation === 'addToGroup' ? 'added' : 'removed'
          };
          break;
        }

        case 'isMemberOf': {
          const groupDn = replaceVars(context.getNodeParameter('groupDn', '') as string);
          const entryDn = replaceVars(context.getNodeParameter('entryDn', '') as string);
          const memberAttribute = context.getNodeParameter('memberAttribute', 'member') as string;

          const isMember = await new Promise<boolean>((resolve, reject) => {
            client.compare(groupDn, memberAttribute, entryDn, (err, matched) => {
              if (err) reject(new Error(`Membership check failed: ${err.message}`));
              else resolve(matched);
            });
          });

          result = { isMember, group: groupDn, member: entryDn };
          break;
        }

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      client.destroy();

      return {
        success: true,
        output: [{
          json: result
        }]
      };
    } catch (error: any) {
      client.destroy();

      if (context.continueOnFail()) {
        return {
          success: true,
          output: [{
            json: {
              error: error.message,
              success: false
            }
          }]
        };
      }
      throw error;
    }
  }
};
