import { NodeType } from '../../types';

export const renameFieldsNode: NodeType = {
  name: 'renameFields',
  displayName: 'Rename Fields',
  description: 'Rename fields in items',
  icon: 'fa:tag',
  category: 'Transform',
  version: 1,
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Input data'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Output with renamed fields'
    }
  ],
  properties: [
    {
      name: 'renames',
      displayName: 'Renames',
      type: 'json',
      default: [
        { oldName: 'firstName', newName: 'first_name' },
        { oldName: 'lastName', newName: 'last_name' }
      ],
      description: 'Array of {oldName, newName} mappings'
    },
    {
      name: 'mode',
      displayName: 'Mode',
      type: 'options',
      options: [
        { name: 'List Mapping', value: 'list' },
        { name: 'Auto Transform (snake_case)', value: 'snake' },
        { name: 'Auto Transform (camelCase)', value: 'camel' },
        { name: 'Auto Transform (kebab-case)', value: 'kebab' }
      ],
      default: 'list',
      description: 'How to rename fields'
    }
  ],
  execute: async (context) => {
    try {
      const mode = context.getNodeParameter('mode', 'list') as string;
      const items = context.getInputData();

      const toSnakeCase = (str: string) => {
        return str
          .replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
          .replace(/^_/, '');
      };

      const toCamelCase = (str: string) => {
        return str
          .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
          .replace(/^([A-Z])/, letter => letter.toLowerCase());
      };

      const toKebabCase = (str: string) => {
        return str
          .replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
          .replace(/^-/, '');
      };

      const renameKeys = (obj: any, transform: (key: string) => string): any => {
        if (Array.isArray(obj)) {
          return obj.map(item => renameKeys(item, transform));
        }
        if (obj !== null && typeof obj === 'object') {
          return Object.keys(obj).reduce((acc, key) => {
            const newKey = transform(key);
            acc[newKey] = renameKeys(obj[key], transform);
            return acc;
          }, {} as any);
        }
        return obj;
      };

      const output = items.map(item => {
        let newJson = { ...item.json };

        if (mode === 'list') {
          const renames = context.getNodeParameter('renames', []) as Array<{
            oldName: string;
            newName: string;
          }>;

          for (const { oldName, newName } of renames) {
            if (oldName.includes('.')) {
              // Handle nested paths
              const keys = oldName.split('.');
              let source = newJson;
              for (let i = 0; i < keys.length - 1; i++) {
                if (!(keys[i] in source)) break;
                source = source[keys[i]];
              }
              const lastKey = keys[keys.length - 1];
              if (lastKey in source) {
                const value = source[lastKey];
                delete source[lastKey];

                // Set at new location
                const newKeys = newName.split('.');
                let target = newJson;
                for (let i = 0; i < newKeys.length - 1; i++) {
                  if (!(newKeys[i] in target)) {
                    target[newKeys[i]] = {};
                  }
                  target = target[newKeys[i]];
                }
                target[newKeys[newKeys.length - 1]] = value;
              }
            } else {
              if (oldName in newJson) {
                const value = newJson[oldName];
                delete newJson[oldName];
                newJson[newName] = value;
              }
            }
          }
        } else {
          let transform: (key: string) => string;
          switch (mode) {
            case 'snake':
              transform = toSnakeCase;
              break;
            case 'camel':
              transform = toCamelCase;
              break;
            case 'kebab':
              transform = toKebabCase;
              break;
            default:
              transform = k => k;
          }
          newJson = renameKeys(newJson, transform);
        }

        return {
          ...item,
          json: newJson
        };
      });

      return {
        success: true,
        output
      };
    } catch (error: any) {
      if (context.continueOnFail()) {
        return {
          success: true,
          output: [{
            json: { error: error.message }
          }]
        };
      }
      throw error;
    }
  }
};
