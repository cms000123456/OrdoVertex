import { NodeType } from '../../types';

export const manualTriggerNode: NodeType = {
  name: 'manualTrigger',
  displayName: 'Manual Trigger',
  description: 'Trigger workflow execution manually',
  icon: 'fa:hand-pointer',
  category: 'Triggers',
  version: 1,
  inputs: [],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Trigger output'
    }
  ],
  properties: [
    {
      name: 'note',
      displayName: 'Note',
      type: 'string',
      placeholder: 'Add a note about this trigger...',
      description: 'Optional note for documentation'
    }
  ],
  execute: async (context) => {
    // Manual trigger just passes through
    return {
      success: true,
      output: context.items.length > 0 ? context.items : [{}]
    };
  }
};
