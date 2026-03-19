import { NodeType } from '../../types';

export const dateTimeNode: NodeType = {
  name: 'dateTime',
  displayName: 'Date & Time',
  description: 'Format and manipulate dates',
  icon: 'fa:calendar-days',
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
      description: 'Output with formatted dates'
    }
  ],
  properties: [
    {
      name: 'action',
      displayName: 'Action',
      type: 'options',
      options: [
        { name: 'Format Date', value: 'format' },
        { name: 'Add/Subtract Time', value: 'add' },
        { name: 'Get Difference', value: 'diff' },
        { name: 'Get Start Of', value: 'startOf' },
        { name: 'Get End Of', value: 'endOf' },
        { name: 'Parse Custom Format', value: 'parse' }
      ],
      default: 'format',
      description: 'Date operation to perform'
    },
    {
      name: 'field',
      displayName: 'Date Field',
      type: 'string',
      default: 'date',
      description: 'Field containing the date'
    },
    {
      name: 'outputField',
      displayName: 'Output Field',
      type: 'string',
      default: 'formattedDate',
      description: 'Field to store the result'
    },
    {
      name: 'format',
      displayName: 'Format',
      type: 'options',
      options: [
        { name: 'ISO 8601', value: 'iso' },
        { name: 'YYYY-MM-DD', value: 'yyyy-MM-dd' },
        { name: 'DD/MM/YYYY', value: 'dd/MM/yyyy' },
        { name: 'MM/DD/YYYY', value: 'MM/dd/yyyy' },
        { name: 'Full Date & Time', value: 'full' },
        { name: 'Relative Time', value: 'relative' },
        { name: 'Custom', value: 'custom' }
      ],
      default: 'iso',
      description: 'Output format',
      displayOptions: {
        show: {
          action: ['format']
        }
      }
    },
    {
      name: 'customFormat',
      displayName: 'Custom Format',
      type: 'string',
      default: 'yyyy-MM-dd HH:mm:ss',
      placeholder: 'e.g., yyyy-MM-dd HH:mm:ss',
      description: 'Custom date format',
      displayOptions: {
        show: {
          action: ['format'],
          format: ['custom']
        }
      }
    },
    {
      name: 'amount',
      displayName: 'Amount',
      type: 'number',
      default: 1,
      description: 'Amount to add (negative to subtract)',
      displayOptions: {
        show: {
          action: ['add']
        }
      }
    },
    {
      name: 'unit',
      displayName: 'Unit',
      type: 'options',
      options: [
        { name: 'Years', value: 'year' },
        { name: 'Months', value: 'month' },
        { name: 'Weeks', value: 'week' },
        { name: 'Days', value: 'day' },
        { name: 'Hours', value: 'hour' },
        { name: 'Minutes', value: 'minute' },
        { name: 'Seconds', value: 'second' }
      ],
      default: 'day',
      description: 'Time unit',
      displayOptions: {
        show: {
          action: ['add', 'diff', 'startOf', 'endOf']
        }
      }
    },
    {
      name: 'secondDateField',
      displayName: 'Second Date Field',
      type: 'string',
      default: 'endDate',
      description: 'Field with second date for comparison',
      displayOptions: {
        show: {
          action: ['diff']
        }
      }
    },
    {
      name: 'timezone',
      displayName: 'Timezone',
      type: 'string',
      default: 'UTC',
      placeholder: 'e.g., America/New_York',
      description: 'Timezone for formatting'
    }
  ],
  execute: async (context) => {
    try {
      const action = context.getNodeParameter('action', 'format') as string;
      const field = context.getNodeParameter('field', 'date') as string;
      const outputField = context.getNodeParameter('outputField', 'formattedDate') as string;
      const timezone = context.getNodeParameter('timezone', 'UTC') as string;
      const items = context.getInputData();

      const formatDate = (date: Date, fmt: string) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        const map: Record<string, string> = {
          'yyyy': date.getFullYear().toString(),
          'MM': pad(date.getMonth() + 1),
          'dd': pad(date.getDate()),
          'HH': pad(date.getHours()),
          'mm': pad(date.getMinutes()),
          'ss': pad(date.getSeconds()),
          'SSS': date.getMilliseconds().toString().padStart(3, '0')
        };
        return fmt.replace(/yyyy|MM|dd|HH|mm|ss|SSS/g, match => map[match]);
      };

      const getRelativeTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 30) return `${Math.floor(days / 30)} months ago`;
        if (days > 0) return `${days} days ago`;
        if (hours > 0) return `${hours} hours ago`;
        if (minutes > 0) return `${minutes} minutes ago`;
        return 'just now';
      };

      const output = items.map(item => {
        const dateValue = item.json[field];
        const date = new Date(dateValue);

        if (isNaN(date.getTime())) {
          return {
            ...item,
            json: {
              ...item.json,
              [outputField]: null,
              [`${outputField}Error`]: 'Invalid date'
            }
          };
        }

        let result: any;

        switch (action) {
          case 'format': {
            const format = context.getNodeParameter('format', 'iso') as string;
            const customFormat = context.getNodeParameter('customFormat', 'yyyy-MM-dd HH:mm:ss') as string;

            switch (format) {
              case 'iso':
                result = date.toISOString();
                break;
              case 'yyyy-MM-dd':
                result = formatDate(date, 'yyyy-MM-dd');
                break;
              case 'dd/MM/yyyy':
                result = formatDate(date, 'dd/MM/yyyy');
                break;
              case 'MM/dd/yyyy':
                result = formatDate(date, 'MM/dd/yyyy');
                break;
              case 'full':
                result = date.toLocaleString('en-US', { timeZone: timezone });
                break;
              case 'relative':
                result = getRelativeTime(date);
                break;
              case 'custom':
                result = formatDate(date, customFormat);
                break;
              default:
                result = date.toISOString();
            }
            break;
          }

          case 'add': {
            const amount = context.getNodeParameter('amount', 1) as number;
            const unit = context.getNodeParameter('unit', 'day') as string;
            const newDate = new Date(date);

            switch (unit) {
              case 'year': newDate.setFullYear(newDate.getFullYear() + amount); break;
              case 'month': newDate.setMonth(newDate.getMonth() + amount); break;
              case 'week': newDate.setDate(newDate.getDate() + amount * 7); break;
              case 'day': newDate.setDate(newDate.getDate() + amount); break;
              case 'hour': newDate.setHours(newDate.getHours() + amount); break;
              case 'minute': newDate.setMinutes(newDate.getMinutes() + amount); break;
              case 'second': newDate.setSeconds(newDate.getSeconds() + amount); break;
            }
            result = newDate.toISOString();
            break;
          }

          case 'diff': {
            const secondField = context.getNodeParameter('secondDateField', 'endDate') as string;
            const secondDate = new Date(item.json[secondField]);
            const unit = context.getNodeParameter('unit', 'day') as string;

            if (isNaN(secondDate.getTime())) {
              result = null;
            } else {
              const diffMs = secondDate.getTime() - date.getTime();
              switch (unit) {
                case 'year': result = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365)); break;
                case 'month': result = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30)); break;
                case 'week': result = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7)); break;
                case 'day': result = Math.floor(diffMs / (1000 * 60 * 60 * 24)); break;
                case 'hour': result = Math.floor(diffMs / (1000 * 60 * 60)); break;
                case 'minute': result = Math.floor(diffMs / (1000 * 60)); break;
                case 'second': result = Math.floor(diffMs / 1000); break;
                default: result = diffMs;
              }
            }
            break;
          }

          case 'startOf': {
            const unit = context.getNodeParameter('unit', 'day') as string;
            const newDate = new Date(date);
            switch (unit) {
              case 'year': newDate.setMonth(0, 1); newDate.setHours(0, 0, 0, 0); break;
              case 'month': newDate.setDate(1); newDate.setHours(0, 0, 0, 0); break;
              case 'week': {
                const day = newDate.getDay();
                newDate.setDate(newDate.getDate() - day);
                newDate.setHours(0, 0, 0, 0);
                break;
              }
              case 'day': newDate.setHours(0, 0, 0, 0); break;
              case 'hour': newDate.setMinutes(0, 0, 0); break;
              case 'minute': newDate.setSeconds(0, 0); break;
              case 'second': newDate.setMilliseconds(0); break;
            }
            result = newDate.toISOString();
            break;
          }

          case 'endOf': {
            const unit = context.getNodeParameter('unit', 'day') as string;
            const newDate = new Date(date);
            switch (unit) {
              case 'year': newDate.setMonth(11, 31); newDate.setHours(23, 59, 59, 999); break;
              case 'month': newDate.setMonth(newDate.getMonth() + 1, 0); newDate.setHours(23, 59, 59, 999); break;
              case 'week': {
                const day = newDate.getDay();
                newDate.setDate(newDate.getDate() + (6 - day));
                newDate.setHours(23, 59, 59, 999);
                break;
              }
              case 'day': newDate.setHours(23, 59, 59, 999); break;
              case 'hour': newDate.setMinutes(59, 59, 999); break;
              case 'minute': newDate.setSeconds(59, 999); break;
              case 'second': newDate.setMilliseconds(999); break;
            }
            result = newDate.toISOString();
            break;
          }

          default:
            result = date.toISOString();
        }

        return {
          ...item,
          json: {
            ...item.json,
            [outputField]: result
          }
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
