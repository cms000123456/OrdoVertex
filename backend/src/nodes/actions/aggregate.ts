import { NodeType } from '../../types';

export const aggregateNode: NodeType = {
  name: 'aggregate',
  displayName: 'Aggregate',
  description: 'Aggregate multiple items into one or perform calculations',
  icon: 'fa:calculator',
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
      description: 'Aggregated output'
    }
  ],
  properties: [
    {
      name: 'operation',
      displayName: 'Operation',
      type: 'options',
      options: [
        { name: 'Combine All Items', value: 'combine' },
        { name: 'Count', value: 'count' },
        { name: 'Sum', value: 'sum' },
        { name: 'Average', value: 'average' },
        { name: 'Min', value: 'min' },
        { name: 'Max', value: 'max' },
        { name: 'Unique Values', value: 'unique' }
      ],
      default: 'combine',
      description: 'Aggregation operation to perform'
    },
    {
      name: 'fieldToAggregate',
      displayName: 'Field to Aggregate',
      type: 'string',
      placeholder: 'price',
      description: 'The field to aggregate (for sum, average, min, max)',
      displayOptions: {
        show: {
          operation: ['sum', 'average', 'min', 'max', 'unique']
        }
      }
    }
  ],
  execute: async (context) => {
    try {
      const operation = context.getNodeParameter('operation', 'combine') as string;
      const fieldToAggregate = context.getNodeParameter('fieldToAggregate', '') as string;
      const items = context.getInputData();

      let result: any;

      switch (operation) {
        case 'combine':
          result = {
            count: items.length,
            items: items.map(item => item.json)
          };
          break;

        case 'count':
          result = { count: items.length };
          break;

        case 'sum':
          if (!fieldToAggregate) {
            throw new Error('Field to aggregate is required for sum operation');
          }
          result = {
            sum: items.reduce((acc, item) => {
              const val = getValueByPath(item.json, fieldToAggregate);
              return acc + (Number(val) || 0);
            }, 0),
            count: items.length
          };
          break;

        case 'average':
          if (!fieldToAggregate) {
            throw new Error('Field to aggregate is required for average operation');
          }
          const sum = items.reduce((acc, item) => {
            const val = getValueByPath(item.json, fieldToAggregate);
            return acc + (Number(val) || 0);
          }, 0);
          result = {
            average: items.length > 0 ? sum / items.length : 0,
            sum,
            count: items.length
          };
          break;

        case 'min':
          if (!fieldToAggregate) {
            throw new Error('Field to aggregate is required for min operation');
          }
          const values = items
            .map(item => Number(getValueByPath(item.json, fieldToAggregate)))
            .filter(v => !isNaN(v));
          result = {
            min: values.length > 0 ? Math.min(...values) : null,
            count: values.length
          };
          break;

        case 'max':
          if (!fieldToAggregate) {
            throw new Error('Field to aggregate is required for max operation');
          }
          const maxValues = items
            .map(item => Number(getValueByPath(item.json, fieldToAggregate)))
            .filter(v => !isNaN(v));
          result = {
            max: maxValues.length > 0 ? Math.max(...maxValues) : null,
            count: maxValues.length
          };
          break;

        case 'unique':
          if (!fieldToAggregate) {
            result = {
              uniqueValues: [...new Set(items.map(item => JSON.stringify(item.json)))].map(s => JSON.parse(s)),
              count: items.length,
              uniqueCount: new Set(items.map(item => JSON.stringify(item.json))).size
            };
          } else {
            const fieldValues = items.map(item => getValueByPath(item.json, fieldToAggregate));
            result = {
              uniqueValues: [...new Set(fieldValues)],
              count: items.length,
              uniqueCount: new Set(fieldValues).size
            };
          }
          break;

        default:
          result = { items: items.map(item => item.json) };
      }

      return {
        success: true,
        output: [{ json: result }]
      };
    } catch (error: any) {
      if (context.continueOnFail()) {
        return {
          success: true,
          output: [{ json: { error: error.message } }]
        };
      }
      throw error;
    }
  }
};

function getValueByPath(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}
