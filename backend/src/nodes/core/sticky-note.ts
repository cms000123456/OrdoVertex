import { NodeType } from '../../types';

export const stickyNoteNode: NodeType = {
  name: 'stickyNote',
  displayName: '📝 Sticky Note',
  description: 'Add notes and annotations to your workflow',
  icon: 'fa:note-sticky',
  category: 'Core',
  version: 1,
  // Sticky notes don't have inputs/outputs - they're just annotations
  inputs: [],
  outputs: [],
  properties: [
    {
      name: 'text',
      displayName: 'Note Text',
      type: 'multiline',
      default: 'Add your note here...',
      description: 'The text content of your sticky note',
      placeholder: 'Enter your note or annotation...'
    },
    {
      name: 'color',
      displayName: 'Color',
      type: 'options',
      options: [
        { name: '🟡 Yellow', value: 'yellow' },
        { name: '🟢 Green', value: 'green' },
        { name: '🔵 Blue', value: 'blue' },
        { name: '🔴 Red', value: 'red' },
        { name: '🟣 Purple', value: 'purple' },
        { name: '🟠 Orange', value: 'orange' },
        { name: '⚪ Gray', value: 'gray' }
      ],
      default: 'yellow',
      description: 'Sticky note color'
    },
    {
      name: 'width',
      displayName: 'Width',
      type: 'number',
      default: 200,
      description: 'Note width in pixels'
    },
    {
      name: 'height',
      displayName: 'Height',
      type: 'number',
      default: 150,
      description: 'Note height in pixels'
    }
  ],
  execute: async (context) => {
    // Sticky notes don't execute - they're just annotations
    return {
      success: true,
      output: []
    };
  }
};
