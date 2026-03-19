import { NodeType } from '../../types';

export const setNode: NodeType = {
  name: 'set',
  displayName: 'Set',
  description: 'Set values on items',
  icon: 'fa:pen-to-square',
  category: 'Actions',
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
      description: 'Output with set values'
    }
  ],
  properties: [
    {
      name: 'mode',
      displayName: 'Mode',
      type: 'options',
      options: [
        { name: 'Set Individual Fields', value: 'manual' },
        { name: 'Set from JSON', value: 'json' }
      ],
      default: 'manual',
      description: 'How to set values'
    },
    {
      name: 'values',
      displayName: 'Values',
      type: 'json',
      default: [
        { name: 'newField', value: 'newValue' }
      ],
      description: 'Fields to set',
      displayOptions: {
        show: {
          mode: ['manual']
        }
      }
    },
    {
      name: 'jsonData',
      displayName: 'JSON Data',
      type: 'multiline',
      default: '{\n  "key": "value"\n}',
      description: 'JSON object to merge with items',
      displayOptions: {
        show: {
          mode: ['json']
        }
      }
    },
    {
      name: 'options',
      displayName: 'Options',
      type: 'json',
      default: {
        dotNotation: true,
        includeOtherFields: true
      },
      description: 'Additional options'
    }
  ],
  execute: async (context) => {
    try {
      const mode = context.getNodeParameter('mode', 'manual') as string;
      const options = context.getNodeParameter('options', { dotNotation: true, includeOtherFields: true }) as any;
      const items = context.getInputData();

      let output: any[];

      if (mode === 'manual') {
        const values = context.getNodeParameter('values', []) as Array<{ name: string; value: any }>;

        output = items.map(item => {
          const newItem = options.includeOtherFields !== false 
            ? { ...item }
            : { json: {} };

          for (const { name, value } of values) {
            if (options.dotNotation !== false && name.includes('.')) {
              const keys = name.split('.');
              let target = newItem.json;
              for (let i = 0; i < keys.length - 1; i++) {
                if (!(keys[i] in target)) {
                  target[keys[i]] = {};
                }
                target = target[keys[i]];
              }
              target[keys[keys.length - 1]] = value;
            } else {
              newItem.json[name] = value;
            }
          }

          return newItem;
        });
      } else {
        const jsonData = context.getNodeParameter('jsonData', '{}') as string;
        let parsedData: Record<string, any>;

        try {
          parsedData = JSON.parse(jsonData);
        } catch (e) {
          throw new Error('Invalid JSON data');
        }

        output = items.map(item => {
          if (options.includeOtherFields !== false) {
            return {
              ...item,
              json: { ...item.json, ...parsedData }
            };
          }
          return {
            json: { ...parsedData }
          };
        });
      }

      return {
        success: true,
        output
      };
    } catch (error: any) {
      if (context.continueOnFail()) {
        return {
          success: true,
          output: [{
            json: {
              error: error.message
            }
          }]
        };
      }
      throw error;
    }
  }
};
