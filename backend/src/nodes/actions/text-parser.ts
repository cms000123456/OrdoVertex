import { NodeType } from '../../types';

export const textParserNode: NodeType = {
  name: 'textParser',
  displayName: 'Text Parser',
  description: 'Parse text in various formats (RSS, XML, JSON, CSV, Regex)',
  icon: 'fa:file-code',
  category: 'Actions',
  version: 1,
  inputs: [
    {
      name: 'input',
      type: 'all',
      description: 'Input containing text to parse'
    }
  ],
  outputs: [
    {
      name: 'output',
      type: 'all',
      description: 'Parsed data'
    }
  ],
  properties: [
    {
      name: 'parseMode',
      displayName: 'Parse Mode',
      type: 'options',
      options: [
        { name: 'RSS Feed', value: 'rss' },
        { name: 'XML', value: 'xml' },
        { name: 'JSON', value: 'json' },
        { name: 'CSV', value: 'csv' },
        { name: 'Regex Extract', value: 'regex' },
        { name: 'Split', value: 'split' }
      ],
      default: 'rss',
      description: 'Format to parse'
    },
    {
      name: 'sourceField',
      displayName: 'Source Field',
      type: 'string',
      default: '{{ $input.body }}',
      description: 'Field containing text to parse (e.g., {{ $input.body }}, {{ $input.text }})'
    },
    {
      name: 'regexPattern',
      displayName: 'Regex Pattern',
      type: 'string',
      default: '',
      description: 'Regex pattern with capture groups (e.g., <title>(.*?)</title>)',
      displayOptions: {
        show: {
          parseMode: ['regex']
        }
      }
    },
    {
      name: 'splitDelimiter',
      displayName: 'Delimiter',
      type: 'string',
      default: '\\n',
      description: 'Delimiter to split by (use \\n for newline)',
      displayOptions: {
        show: {
          parseMode: ['split']
        }
      }
    },
    {
      name: 'csvHeaders',
      displayName: 'Has Headers',
      type: 'boolean',
      default: true,
      description: 'First row contains column headers',
      displayOptions: {
        show: {
          parseMode: ['csv']
        }
      }
    },
    {
      name: 'filterKeywords',
      displayName: 'Filter Keywords',
      type: 'string',
      default: '',
      description: 'Comma-separated keywords to filter results (optional)',
      displayOptions: {
        show: {
          parseMode: ['rss', 'xml']
        }
      }
    },
    {
      name: 'maxResults',
      displayName: 'Max Results',
      type: 'number',
      default: 50,
      description: 'Maximum number of results to return'
    }
  ],
  execute: async (context) => {
    try {
      const items = context.getInputData();
      const item = items[0]?.json || {};
      
      const parseMode = context.getNodeParameter('parseMode', 'rss') as string;
      let sourceField = context.getNodeParameter('sourceField', '{{ $input.body }}') as string;
      const maxResults = context.getNodeParameter('maxResults', 50) as number;
      
      // Replace template variables
      sourceField = sourceField.replace(/\{\{\s*\$input\.(\w+)\s*\}\}/g, (_, key) => {
        return item[key] ?? '';
      });
      
      // Get text to parse
      let text = sourceField;
      if (!text && item.body) text = item.body;
      if (!text && item.text) text = item.text;
      if (!text && item.data) text = item.data;
      if (!text && item.content) text = item.content;
      if (!text) text = JSON.stringify(item);
      
      let result: any = { parsed: false, count: 0, items: [] };
      
      switch (parseMode) {
        case 'rss':
          result = parseRSS(text, maxResults);
          break;
        case 'xml':
          result = parseXML(text, maxResults);
          break;
        case 'json':
          result = parseJSON(text);
          break;
        case 'csv':
          const hasHeaders = context.getNodeParameter('csvHeaders', true) as boolean;
          result = parseCSV(text, hasHeaders, maxResults);
          break;
        case 'regex':
          const pattern = context.getNodeParameter('regexPattern', '') as string;
          result = parseRegex(text, pattern, maxResults);
          break;
        case 'split':
          const delimiter = context.getNodeParameter('splitDelimiter', '\n') as string;
          result = parseSplit(text, delimiter, maxResults);
          break;
      }
      
      // Apply keyword filter if specified
      const filterKeywords = context.getNodeParameter('filterKeywords', '') as string;
      if (filterKeywords && result.items) {
        const keywords = filterKeywords.toLowerCase().split(',').map(k => k.trim()).filter(k => k);
        const beforeCount = result.items.length;
        result.items = result.items.filter((itm: any) => {
          const textToSearch = JSON.stringify(itm).toLowerCase();
          return keywords.some(kw => textToSearch.includes(kw));
        });
        result.filteredCount = result.items.length;
        result.filterRemoved = beforeCount - result.items.length;
      }
      
      return {
        success: true,
        output: [{ json: result }]
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Text parsing failed'
      };
    }
  }
};

// RSS Parser
function parseRSS(xml: string, maxResults: number) {
  const items: any[] = [];
  const itemRegex = /<(item|entry)[^>]*>([\s\S]*?)<\/\1>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null && items.length < maxResults) {
    const itemXml = match[2];
    const parsed: any = {};
    
    // Extract common fields
    parsed.title = extractContent(itemXml, 'title');
    parsed.link = extractLink(itemXml);
    parsed.description = extractContent(itemXml, 'description') || 
                        extractContent(itemXml, 'summary') || 
                        extractContent(itemXml, 'content');
    parsed.pubDate = extractContent(itemXml, 'pubDate') || 
                     extractContent(itemXml, 'published') || 
                     extractContent(itemXml, 'updated') ||
                     extractContent(itemXml, 'date');
    parsed.author = extractContent(itemXml, 'author') || 
                    extractContent(itemXml, 'creator');
    parsed.category = extractContent(itemXml, 'category');
    parsed.guid = extractContent(itemXml, 'guid') || extractContent(itemXml, 'id');
    
    if (parsed.title || parsed.description) {
      items.push(parsed);
    }
  }
  
  // Also extract feed metadata
  const feedTitle = extractContent(xml, 'title') || '';
  const feedDescription = extractContent(xml, 'description') || extractContent(xml, 'subtitle') || '';
  const feedLink = extractContent(xml, 'link') || '';
  
  return {
    parsed: true,
    format: 'rss',
    count: items.length,
    feedTitle: decodeEntities(feedTitle),
    feedDescription: decodeEntities(feedDescription),
    feedLink,
    items: items.map(item => ({
      ...item,
      title: decodeEntities(item.title),
      description: decodeEntities(item.description).substring(0, 300),
      author: decodeEntities(item.author)
    }))
  };
}

// XML Parser - extracts all tags
function parseXML(xml: string, maxResults: number) {
  const items: any[] = [];
  // Try to find repeating elements
  const tagMatch = xml.match(/<(\w+)[^>]*>[\s\S]*?<\/\1>/g);
  
  if (tagMatch) {
    tagMatch.slice(0, maxResults).forEach(tagXml => {
      const tagName = tagXml.match(/<(\w+)/)?.[1] || 'item';
      const children: any = {};
      
      // Extract all child elements
      const childRegex = /<(\w+)[^>]*>([\s\S]*?)<\/\1>/g;
      let childMatch;
      while ((childMatch = childRegex.exec(tagXml)) !== null) {
        const key = childMatch[1];
        const value = decodeEntities(childMatch[2]);
        if (!children[key]) {
          children[key] = value;
        } else if (Array.isArray(children[key])) {
          children[key].push(value);
        } else {
          children[key] = [children[key], value];
        }
      }
      
      items.push({ tagName, ...children });
    });
  }
  
  return {
    parsed: true,
    format: 'xml',
    count: items.length,
    items
  };
}

// JSON Parser
function parseJSON(text: string) {
  try {
    const data = JSON.parse(text);
    const items = Array.isArray(data) ? data : [data];
    return {
      parsed: true,
      format: 'json',
      count: items.length,
      items
    };
  } catch (e) {
    return {
      parsed: false,
      format: 'json',
      error: 'Invalid JSON',
      count: 0,
      items: []
    };
  }
}

// CSV Parser
function parseCSV(text: string, hasHeaders: boolean, maxResults: number) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) {
    return { parsed: false, format: 'csv', count: 0, items: [] };
  }
  
  const delimiter = text.includes('\t') ? '\t' : ',';
  const headers = hasHeaders 
    ? lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''))
    : lines[0].split(delimiter).map((_, i) => `col${i}`);
  
  const startIndex = hasHeaders ? 1 : 0;
  const items = lines.slice(startIndex, startIndex + maxResults).map(line => {
    const values = line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
    const obj: any = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || '';
    });
    return obj;
  });
  
  return {
    parsed: true,
    format: 'csv',
    count: items.length,
    headers,
    items
  };
}

// Regex Parser
function parseRegex(text: string, pattern: string, maxResults: number) {
  if (!pattern) {
    return { parsed: false, format: 'regex', error: 'No pattern provided', count: 0, items: [] };
  }
  
  const items: any[] = [];
  try {
    const regex = new RegExp(pattern, 'g');
    let match;
    while ((match = regex.exec(text)) !== null && items.length < maxResults) {
      const item: any = { match: match[0] };
      match.forEach((group, i) => {
        if (i > 0) item[`group${i}`] = group;
      });
      items.push(item);
    }
  } catch (e) {
    return { parsed: false, format: 'regex', error: 'Invalid regex pattern', count: 0, items: [] };
  }
  
  return {
    parsed: true,
    format: 'regex',
    count: items.length,
    items
  };
}

// Split Parser
function parseSplit(text: string, delimiter: string, maxResults: number) {
  // Handle escape sequences
  const actualDelimiter = delimiter
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r');
  
  const parts = text.split(actualDelimiter).filter(p => p.trim()).slice(0, maxResults);
  
  return {
    parsed: true,
    format: 'split',
    count: parts.length,
    delimiter: actualDelimiter,
    items: parts.map((text, index) => ({ index, text: text.trim() }))
  };
}

// Helper functions
function extractContent(xml: string, tag: string): string {
  // CDATA version
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  let match = xml.match(cdataRegex);
  if (match) return match[1].trim();
  
  // Normal version
  const normalRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  match = xml.match(normalRegex);
  if (match) return match[1].trim();
  
  return '';
}

function extractLink(xml: string): string {
  let match = xml.match(/<link>([^<]+)<\/link>/);
  if (match) return match[1].trim();
  
  match = xml.match(/<link[^>]+href="([^"]+)"/i);
  if (match) return match[1].trim();
  
  match = xml.match(/<guid[^>]*>([^<]+)<\/guid>/);
  if (match) return match[1].trim();
  
  return '';
}

function decodeEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/<[^>]+>/g, '')
    .trim();
}
