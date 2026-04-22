import { aiAgentTemplates } from '../utils/ai-templates';

// All available templates
export const workflowTemplates = {
  // Tutorial Template
  'tutorial-data-flow': {
    name: '📚 Tutorial: Data Flow Demo',
    description: 'Learn how data flows between nodes. Click Execute and inspect each node to see Input/Output data!',
    category: 'Tutorial',
    tags: ['tutorial', 'learning', 'example'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        description: 'Click Execute to start the workflow',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Generate Sample Data',
        description: 'Creates sample user data to demonstrate data flow',
        position: { x: 400, y: 200 },
        parameters: {
          code: `const users = [
  { id: 1, name: 'Alice', role: 'admin', department: 'Engineering' },
  { id: 2, name: 'Bob', role: 'user', department: 'Marketing' },
  { id: 3, name: 'Carol', role: 'user', department: 'Engineering' }
];
return [{ json: {
  generatedAt: new Date().toISOString(),
  count: users.length,
  users: users,
  source: 'tutorial-workflow'
} }];`
        }
      },
      {
        id: 'code-2',
        type: 'code',
        name: 'Transform Data',
        description: 'Filters Engineering users and adds computed fields',
        position: { x: 700, y: 200 },
        parameters: {
          code: `// 'items' is already provided as input data
const data = items[0]?.json || {};
const engineeringUsers = (data.users || []).filter(u => u.department === 'Engineering');
const transformed = engineeringUsers.map(user => ({
  ...user,
  email: user.name.toLowerCase() + '@company.com',
  accessLevel: user.role === 'admin' ? 'full' : 'limited'
}));
return [{ json: {
  originalCount: data.count,
  filteredCount: transformed.length,
  department: 'Engineering',
  users: transformed
} }];`
        }
      },
      {
        id: 'set-1',
        type: 'set',
        name: 'Final Result',
        description: 'Formats the final output',
        position: { x: 1000, y: 200 },
        parameters: {
          mode: 'manual',
          values: [
            { name: 'summary', value: 'Tutorial workflow completed successfully' },
            { name: 'timestamp', value: '{{ $now }}' }
          ]
        }
      }
    ],
    connections: [
      { source: 'trigger-1', sourceHandle: 'default', target: 'code-1', targetHandle: 'input' },
      { source: 'code-1', sourceHandle: 'default', target: 'code-2', targetHandle: 'input' },
      { source: 'code-2', sourceHandle: 'default', target: 'set-1', targetHandle: 'input' }
    ]
  },

  // Demo Templates
  'demo-weather-api': {
    name: '🌤️ Demo: Weather API',
    description: 'Fetch weather data from free API (no key needed)',
    category: 'Demo',
    tags: ['demo', 'weather', 'api'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'set-1',
        type: 'set',
        name: 'Set Location',
        position: { x: 350, y: 200 },
        parameters: {
          mode: 'manual',
          values: [
            { name: 'city', value: 'London' }
          ]
        }
      },
      {
        id: 'code-encode',
        type: 'code',
        name: 'Build URL',
        position: { x: 600, y: 200 },
        parameters: {
          code: '// Build the full URL with encoded city\nconst city = items[0]?.json?.city || "London";\nconst encoded = encodeURIComponent(city);\nconst url = `https://wttr.in/${encoded}?format=j1`;\nreturn [{ json: { city, url } }];'
        }
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Fetch Weather',
        position: { x: 900, y: 200 },
        parameters: {
          method: 'GET',
          url: '{{ $json.url }}',
          options: {
            timeout: 30000,
            headers: {
              'User-Agent': 'curl/7.64.1'
            }
          }
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Transform Data',
        position: { x: 1200, y: 200 },
        parameters: {
          code: 'const response = items[0]?.json || {};\nconst data = response.body || {};\nconst current = data.current_condition?.[0] || {};\nreturn [{ json: {\n  location: data.request?.[0]?.query || "Unknown",\n  temp: (current.temp_C || "?") + "C",\n  condition: current.weatherDesc?.[0]?.value || "N/A",\n  humidity: (current.humidity || "?") + "%"\n} }];'
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'set-1' },
      { source: 'set-1', target: 'code-encode' },
      { source: 'code-encode', target: 'http-1' },
      { source: 'http-1', target: 'code-1' }
    ]
  },

  'demo-crypto-prices': {
    name: '💰 Demo: Crypto Prices',
    description: 'Fetch crypto prices from CoinGecko (free, no key)',
    category: 'Demo',
    tags: ['demo', 'crypto', 'finance'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Fetch Prices',
        position: { x: 400, y: 200 },
        parameters: {
          method: 'GET',
          url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd'
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Format Prices',
        position: { x: 700, y: 200 },
        parameters: {
          code: 'const response = items[0]?.json || {};\nconst prices = response.body || {};\nreturn [{ json: {\n  bitcoin: "$" + (prices.bitcoin?.usd || "N/A"),\n  ethereum: "$" + (prices.ethereum?.usd || "N/A"),\n  timestamp: new Date().toISOString()\n} }];'
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'http-1' },
      { source: 'http-1', target: 'code-1' }
    ]
  },

  'demo-cat-fact': {
    name: '🐱 Demo: Cat Fact + Image',
    description: 'Get a random cat fact with a cute cat image (free APIs)',
    category: 'Demo',
    tags: ['demo', 'fun', 'animals', 'images'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'http-fact',
        type: 'httpRequest',
        name: 'Get Cat Fact',
        position: { x: 350, y: 100 },
        parameters: {
          method: 'GET',
          url: 'https://catfact.ninja/fact'
        }
      },
      {
        id: 'http-img',
        type: 'httpRequest',
        name: 'Get Cat Image',
        position: { x: 350, y: 250 },
        parameters: {
          method: 'GET',
          url: 'https://cataas.com/cat?json=true'
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Combine Results',
        position: { x: 650, y: 175 },
        parameters: {
          code: `const inputs = items.map(i => i?.json || {});
const factResponse = inputs.find(i => i.body?.fact) || {};
const imgResponse = inputs.find(i => i.body?.url || i.body?._id) || {};
const fact = factResponse.body?.fact || 'Cats are awesome!';
const imgId = imgResponse.body?._id;
const imgUrl = imgId ? 'https://cataas.com/cat/' + imgId : 'https://cataas.com/cat';
return [{ json: { fact, imageUrl: imgUrl, imageMarkdown: '![Cat](' + imgUrl + ')' } }];`
        }
      },
      {
        id: 'display-1',
        type: 'imageDisplay',
        name: 'Show Image',
        position: { x: 950, y: 175 },
        parameters: {
          imageUrl: '{{ $input.imageUrl }}',
          altText: 'Random Cat',
          caption: '{{ $input.fact }}',
          maxWidth: '350px'
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'http-fact' },
      { source: 'trigger-1', target: 'http-img' },
      { source: 'http-fact', target: 'code-1' },
      { source: 'http-img', target: 'code-1' },
      { source: 'code-1', target: 'display-1' }
    ]
  },

  'demo-cat-fact-to-google-chat': {
    name: '🐱 Cat Fact + Image → Google Chat',
    description: 'Fetch a random cat fact and post it with a cat image to a Google Chat space',
    category: 'Demo',
    tags: ['demo', 'fun', 'animals', 'google-chat', 'notification'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'http-fact',
        type: 'httpRequest',
        name: 'Get Cat Fact',
        position: { x: 350, y: 200 },
        parameters: {
          method: 'GET',
          url: 'https://catfact.ninja/fact'
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Build Message',
        position: { x: 600, y: 200 },
        parameters: {
          code: `const body = items[0]?.json?.body || {};
const fact = body.fact || 'Cats are awesome!';
const imageUrl = 'https://cataas.com/cat?width=500&height=500&t=' + Date.now();
return [{ json: { fact, imageUrl } }];`
        }
      },
      {
        id: 'chat-1',
        type: 'googleChat',
        name: 'Post to Google Chat',
        position: { x: 850, y: 200 },
        parameters: {
          webhookUrl: '',
          messageType: 'card',
          cardTitle: '🐱 Cat Fact of the Day',
          cardSubtitle: '',
          cardText: '{{ $input.fact }}',
          cardImageUrl: '{{ $input.imageUrl }}',
          cardImageAspectRatio: 1,
          useTemplate: true
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'http-fact' },
      { source: 'http-fact', target: 'code-1' },
      { source: 'code-1', target: 'chat-1' }
    ]
  },

  'demo-joke-generator': {
    name: '😄 Demo: Joke Generator',
    description: 'Get a random programming joke (free API)',
    category: 'Demo',
    tags: ['demo', 'fun', 'entertainment'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Fetch Joke',
        position: { x: 400, y: 200 },
        parameters: {
          method: 'GET',
          url: 'https://official-joke-api.appspot.com/jokes/programming/random'
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Format Joke',
        position: { x: 700, y: 200 },
        parameters: {
          code: `const response = items[0]?.json || {};
const jokeArray = response.body || [];
const joke = jokeArray[0] || {};
return [{ json: {
  type: joke.type || 'unknown',
  setup: joke.setup || 'Why did the programmer quit his job?',
  punchline: joke.punchline || 'Because he did not get arrays.',
  fullJoke: (joke.setup || '') + '\\n\\n' + (joke.punchline || '')
} }];`
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'http-1' },
      { source: 'http-1', target: 'code-1' }
    ]
  },

  'demo-ip-location': {
    name: '🌍 Demo: IP Location',
    description: 'Get your IP address and location info (free API)',
    category: 'Demo',
    tags: ['demo', 'geolocation', 'network'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Get Location',
        position: { x: 400, y: 200 },
        parameters: {
          method: 'GET',
          url: 'https://ipapi.co/json/'
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Format Location',
        position: { x: 700, y: 200 },
        parameters: {
          code: `const response = items[0]?.json || {};
const data = response.body || {};
return [{ json: {
  ip: data.ip || 'unknown',
  city: data.city || 'unknown',
  region: data.region || 'unknown',
  country: data.country_name || 'unknown',
  countryCode: data.country_code || '??',
  latitude: data.latitude || 0,
  longitude: data.longitude || 0,
  timezone: data.timezone || 'unknown',
  isp: data.org || 'unknown',
  location: (data.city || '?') + ', ' + (data.region || '?') + ', ' + (data.country_name || '?')
} }];`
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'http-1' },
      { source: 'http-1', target: 'code-1' }
    ]
  },

  'demo-dog-image': {
    name: '🐕 Demo: Random Dog Image',
    description: 'Get a random dog image (free API)',
    category: 'Demo',
    tags: ['demo', 'fun', 'animals', 'images'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Get Dog Image',
        position: { x: 350, y: 200 },
        parameters: {
          method: 'GET',
          url: 'https://dog.ceo/api/breeds/image/random'
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Format Result',
        position: { x: 650, y: 200 },
        parameters: {
          code: `const response = items[0]?.json || {};
const data = response.body || {};
const imgUrl = data.message || '';
// Extract breed from URL
const breedMatch = imgUrl.match(/breeds\\/([^/]+)/);
const breed = breedMatch ? breedMatch[1].replace(/-/g, ' ') : 'unknown';
return [{ json: {
  imageUrl: imgUrl,
  breed: breed,
  status: data.status || 'unknown',
  imageMarkdown: '![Dog](' + imgUrl + ')'
} }];`
        }
      },
      {
        id: 'display-1',
        type: 'imageDisplay',
        name: 'Show Image',
        position: { x: 950, y: 200 },
        parameters: {
          imageUrl: '{{ $input.imageUrl }}',
          altText: '{{ $input.breed }}',
          caption: 'Breed: {{ $input.breed }}',
          maxWidth: '350px'
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'http-1' },
      { source: 'http-1', target: 'code-1' },
      { source: 'code-1', target: 'display-1' }
    ]
  },

  'demo-stable-diffusion': {
    name: '🎨 Demo: Stable Diffusion AI Image',
    description: 'Generate AI images using Pollinations (free, no API key). Note: API may be slow/unstable.',
    category: 'Demo',
    tags: ['demo', 'ai', 'image', 'stable-diffusion', 'generative'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Generate',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Build Prompt & URL',
        position: { x: 350, y: 200 },
        parameters: {
          code: `const prompt = 'a beautiful sunset over mountains digital art';
const width = 512;
const height = 512;
const seed = Math.floor(Math.random() * 1000000);
const imageUrl = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) + '?width=' + width + '&height=' + height + '&nologo=true&seed=' + seed;
return [{ json: { prompt, imageUrl, width, height, seed } }];`
        }
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Call Pollinations API',
        position: { x: 650, y: 200 },
        parameters: {
          method: 'GET',
          url: 'https://image.pollinations.ai/prompt/a%20beautiful%20sunset%20over%20mountains%20digital%20art?width=512&height=512&nologo=true&seed=12345',
          options: {
            timeout: 120000,
            responseType: 'arraybuffer'
          }
        }
      },
      {
        id: 'code-2',
        type: 'code',
        name: 'Format Result',
        position: { x: 950, y: 200 },
        parameters: {
          code: `// Get data from previous nodes
const httpResponse = items[0]?.json || {};
const promptData = items[1]?.json || {};

// If HTTP failed, use the URL from code-1 directly
const imageUrl = promptData.imageUrl || 'https://image.pollinations.ai/prompt/a%20beautiful%20sunset%20over%20mountains%20digital%20art?width=512&height=512&nologo=true&seed=12345';
const prompt = promptData.prompt || 'a beautiful sunset over mountains digital art';

// Check if we got binary image data or if HTTP failed
const hasImageData = httpResponse && (httpResponse.body || httpResponse.data);

return [{ json: {
  prompt: prompt,
  imageUrl: imageUrl,
  width: 512,
  height: 512,
  provider: 'Pollinations.ai',
  apiCalled: true,
  apiSuccess: !!hasImageData,
  note: hasImageData ? 'Image generated successfully' : 'API call attempted - view image using URL below',
  _display: {
    type: 'image',
    url: imageUrl,
    alt: 'AI Generated',
    caption: 'Prompt: ' + prompt,
    maxWidth: '512px'
  }
} }];`
        }
      },
      {
        id: 'display-1',
        type: 'imageDisplay',
        name: 'View Image',
        position: { x: 1250, y: 200 },
        parameters: {
          imageUrl: 'https://image.pollinations.ai/prompt/a%20beautiful%20sunset%20over%20mountains%20digital%20art?width=512&height=512&nologo=true&seed=12345',
          altText: 'AI Generated',
          caption: 'a beautiful sunset over mountains digital art',
          maxWidth: '512px'
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'code-1' },
      { source: 'code-1', target: 'http-1' },
      { source: 'http-1', target: 'code-2' },
      { source: 'code-2', target: 'display-1' }
    ]
  },

  'demo-security-rss': {
    name: '🔒 Demo: Security RSS Feed',
    description: 'Fetch and filter computer security news from RSS feed using Text Parser node',
    category: 'Demo',
    tags: ['demo', 'rss', 'security', 'news', 'filter'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Fetch News',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Get Hacker News RSS',
        position: { x: 350, y: 200 },
        parameters: {
          method: 'GET',
          url: 'https://feeds.feedburner.com/TheHackersNews'
        }
      },
      {
        id: 'parser-1',
        type: 'textParser',
        name: 'Parse RSS Feed',
        position: { x: 650, y: 200 },
        parameters: {
          parseMode: 'rss',
          sourceField: '{{ $input.body }}',
          filterKeywords: 'vulnerability,exploit,malware,ransomware,breach,hack,cve,patch,security,cyberattack,phishing,zero-day,backdoor,trojan,spyware,botnet,ddos,data leak,encryption,firewall,antivirus,threat,attack,compromised',
          maxResults: 10
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'http-1' },
      { source: 'http-1', target: 'parser-1' }
    ]
  },

  'demo-security-rss-email': {
    name: '🔒 Demo: Security RSS to Email',
    description: 'Fetch security news and send email digest (requires SMTP credential)',
    category: 'Demo',
    tags: ['demo', 'rss', 'security', 'email', 'digest'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Send Digest',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Fetch Hacker News',
        position: { x: 350, y: 200 },
        parameters: {
          method: 'GET',
          url: 'https://feeds.feedburner.com/TheHackersNews'
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Parse & Filter',
        position: { x: 650, y: 200 },
        parameters: {
          code: `const response = items[0]?.json || {};
const xmlText = response.body || response.data || '';

// Parse RSS XML
function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\\s\\S]*?)<\\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const description = extractTag(itemXml, 'description');
    const pubDate = extractTag(itemXml, 'pubDate');
    
    if (title) {
      items.push({
        title: cleanHtml(title),
        link: cleanHtml(link),
        description: cleanHtml(description).substring(0, 150) + '...',
        pubDate: pubDate
      });
    }
  }
  return items;
}

function extractTag(xml, tag) {
  const regex = new RegExp('<' + tag + '>([\\s\\S]*?)<\\/' + tag + '>');
  const match = xml.match(regex);
  return match ? match[1] : '';
}

function cleanHtml(text) {
  return text.replace(/<![CDATA[|]]>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

const securityKeywords = ['vulnerability', 'exploit', 'malware', 'ransomware', 'breach', 'hack', 'cve', 'patch', 'security', 'cyberattack', 'phishing', 'zero-day', 'backdoor', 'trojan', 'spyware', 'botnet', 'ddos', 'data leak', 'encryption', 'firewall', 'antivirus', 'penetration', 'threat'];

const allItems = parseRSS(xmlText);
const securityItems = allItems.filter(item => {
  const text = (item.title + ' ' + item.description).toLowerCase();
  return securityKeywords.some(keyword => text.includes(keyword));
});

return [{ json: {
  totalArticles: allItems.length,
  securityArticles: securityItems.length,
  articles: securityItems.slice(0, 5),
  keywords: securityKeywords,
  feedSource: 'The Hacker News',
  fetchedAt: new Date().toISOString()
} }];`
        }
      },
      {
        id: 'code-2',
        type: 'code',
        name: 'Format Email',
        position: { x: 950, y: 200 },
        parameters: {
          code: `const data = items[0]?.json || {};
const articles = data.articles || [];

// Build email body
let emailBody = '🔒 SECURITY NEWS DIGEST\\n';
emailBody += '====================\\n\\n';
emailBody += 'Source: ' + (data.feedSource || 'Unknown') + '\\n';
emailBody += 'Found ' + data.securityArticles + ' security articles (out of ' + data.totalArticles + ' total)\\n';
emailBody += 'Generated: ' + new Date(data.fetchedAt).toLocaleString() + '\\n\\n';
emailBody += '--------------------\\n\\n';

articles.forEach((article, index) => {
  emailBody += (index + 1) + '. ' + article.title + '\\n';
  emailBody += article.description + '\\n';
  emailBody += 'Read more: ' + article.link + '\\n';
  emailBody += 'Published: ' + (article.pubDate || 'Unknown') + '\\n\\n';
});

emailBody += '\\n--------------------\\n';
emailBody += 'This digest was generated by OrdoVertex\\n';

return [{ json: {
  to: 'your-email@example.com',
  subject: '🔒 Security News Digest - ' + data.securityArticles + ' articles found',
  body: emailBody,
  htmlBody: '<h2>🔒 Security News Digest</h2><p>Found <strong>' + data.securityArticles + '</strong> security articles</p><hr>' + articles.map((a, i) => '<h3>' + (i+1) + '. ' + a.title + '</h3><p>' + a.description + '</p><p><a href="' + a.link + '">Read more →</a></p>').join('<hr>')
} }];`
        }
      },
      {
        id: 'email-1',
        type: 'sendEmail',
        name: 'Send Digest',
        position: { x: 1250, y: 200 },
        parameters: {
          useCredential: true,
          credentialId: '',
          to: '{{ $input.to }}',
          subject: '{{ $input.subject }}',
          body: '{{ $input.body }}',
          htmlBody: '{{ $input.htmlBody }}'
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'http-1' },
      { source: 'http-1', target: 'code-1' },
      { source: 'code-1', target: 'code-2' },
      { source: 'code-2', target: 'email-1' }
    ]
  },

  'demo-website-health-monitor': {
    name: '🖥️ Demo: Website Health Monitor',
    description: 'Check if a website is up and branch based on the HTTP status code. Demonstrates IF node conditional logic (no API key needed).',
    category: 'Demo',
    tags: ['demo', 'monitoring', 'if', 'conditional'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'set-1',
        type: 'set',
        name: 'Set URL',
        position: { x: 350, y: 200 },
        parameters: {
          mode: 'manual',
          values: [
            { name: 'url', value: 'https://httpbin.org/get' }
          ]
        }
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Check Website',
        position: { x: 600, y: 200 },
        parameters: {
          method: 'GET',
          url: '{{ $json.url }}',
          options: { timeout: 15000 }
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Extract Status',
        position: { x: 850, y: 200 },
        parameters: {
          code: `const response = items[0]?.json || {};
const statusCode = response.statusCode || 0;
const statusOk = statusCode >= 200 && statusCode < 300;
return [{ json: {
  url: response.request?.url || 'unknown',
  statusCode,
  statusOk,
  statusText: statusOk ? 'Online' : 'Offline or Error'
} }];`
        }
      },
      {
        id: 'if-1',
        type: 'if',
        name: 'Is Online?',
        position: { x: 1100, y: 200 },
        parameters: {
          mode: 'simple',
          field: 'statusOk',
          operator: 'eq',
          value: 'true'
        }
      },
      {
        id: 'set-ok',
        type: 'set',
        name: '✅ Online Result',
        position: { x: 1350, y: 100 },
        parameters: {
          mode: 'manual',
          values: [
            { name: 'result', value: 'Website is ONLINE ✅' },
            { name: 'url', value: '{{ $json.url }}' },
            { name: 'statusCode', value: '{{ $json.statusCode }}' }
          ]
        }
      },
      {
        id: 'set-fail',
        type: 'set',
        name: '❌ Offline Result',
        position: { x: 1350, y: 300 },
        parameters: {
          mode: 'manual',
          values: [
            { name: 'result', value: 'Website is OFFLINE or ERROR ❌' },
            { name: 'url', value: '{{ $json.url }}' },
            { name: 'statusCode', value: '{{ $json.statusCode }}' }
          ]
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'set-1' },
      { source: 'set-1', target: 'http-1' },
      { source: 'http-1', target: 'code-1' },
      { source: 'code-1', target: 'if-1' },
      { source: 'if-1', sourceHandle: 'true', target: 'set-ok' },
      { source: 'if-1', sourceHandle: 'false', target: 'set-fail' }
    ]
  },

  'demo-password-generator': {
    name: '🔑 Demo: Password Generator',
    description: 'Generate secure passwords locally without any external API. Demonstrates pure Code node data generation.',
    category: 'Demo',
    tags: ['demo', 'password', 'security', 'offline', 'code'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Generate Passwords',
        position: { x: 350, y: 200 },
        parameters: {
          code: `const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
function gen(len, useSymbols) {
  const pool = chars + (useSymbols ? symbols : '');
  let pwd = '';
  for (let i = 0; i < len; i++) {
    pwd += pool.charAt(Math.floor(Math.random() * pool.length));
  }
  return pwd;
}
const words = ['alpha','bravo','charlie','delta','echo','foxtrot','golf','hotel','india','juliet','kilo','lima','mike','november','oscar','papa','quebec','romeo','sierra','tango'];
function genPhrase() {
  const parts = [];
  for (let i = 0; i < 4; i++) {
    parts.push(words[Math.floor(Math.random() * words.length)]);
  }
  return parts.join('-') + '-' + Math.floor(Math.random() * 1000);
}
return [{ json: {
  simple: gen(8, false),
  strong: gen(16, true),
  passphrase: genPhrase(),
  generatedAt: new Date().toISOString()
} }];`
        }
      },
      {
        id: 'set-1',
        type: 'set',
        name: 'Format Output',
        position: { x: 650, y: 200 },
        parameters: {
          mode: 'manual',
          values: [
            { name: 'summary', value: 'Passwords generated successfully' },
            { name: 'simple', value: '{{ $json.simple }}' },
            { name: 'strong', value: '{{ $json.strong }}' },
            { name: 'passphrase', value: '{{ $json.passphrase }}' },
            { name: 'timestamp', value: '{{ $json.generatedAt }}' }
          ]
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'code-1' },
      { source: 'code-1', target: 'set-1' }
    ]
  },

  'demo-nasa-apod': {
    name: '🚀 Demo: NASA Astronomy Picture of the Day',
    description: "Fetch NASA's Astronomy Picture of the Day with explanation. Uses NASA's free DEMO_KEY.",
    category: 'Demo',
    tags: ['demo', 'nasa', 'space', 'image', 'science'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Fetch APOD',
        position: { x: 350, y: 200 },
        parameters: {
          method: 'GET',
          url: 'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY',
          options: { timeout: 30000 }
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Format APOD',
        position: { x: 650, y: 200 },
        parameters: {
          code: `const response = items[0]?.json || {};
const data = response.body || {};
return [{ json: {
  title: data.title || 'Unknown',
  date: data.date || '',
  explanation: (data.explanation || '').substring(0, 400) + '...',
  imageUrl: data.hdurl || data.url || '',
  mediaType: data.media_type || 'image',
  copyright: data.copyright || 'Public Domain',
  source: 'NASA APOD'
} }];`
        }
      },
      {
        id: 'display-1',
        type: 'imageDisplay',
        name: 'Show Image',
        position: { x: 950, y: 200 },
        parameters: {
          imageUrl: '{{ $input.imageUrl }}',
          altText: '{{ $input.title }}',
          caption: '{{ $input.title }} — {{ $input.date }}',
          maxWidth: '500px'
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'http-1' },
      { source: 'http-1', target: 'code-1' },
      { source: 'code-1', target: 'display-1' }
    ]
  },

  'demo-currency-converter': {
    name: '💱 Demo: Currency Converter',
    description: 'Convert currencies using free exchange rates from OpenER API. Demonstrates Math node with expression mode (no API key needed).',
    category: 'Demo',
    tags: ['demo', 'currency', 'finance', 'math', 'conversion'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'set-1',
        type: 'set',
        name: 'Set Amount & Currencies',
        position: { x: 350, y: 200 },
        parameters: {
          mode: 'manual',
          values: [
            { name: 'amount', value: 100 },
            { name: 'fromCurrency', value: 'USD' },
            { name: 'toCurrency', value: 'EUR' }
          ]
        }
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Fetch Rates',
        position: { x: 600, y: 200 },
        parameters: {
          method: 'GET',
          url: 'https://open.er-api.com/v6/latest/USD',
          options: { timeout: 15000 }
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Extract Rate',
        position: { x: 850, y: 200 },
        parameters: {
          code: `const response = items[0]?.json || {};
const data = response.body || {};
const rates = data.rates || {};
const rate = rates['EUR'] || 0;
return [{ json: {
  fromCurrency: 'USD',
  toCurrency: 'EUR',
  amount: 100,
  rate,
  rateDate: data.time_last_update_utc || new Date().toISOString()
} }];`
        }
      },
      {
        id: 'math-1',
        type: 'math',
        name: 'Calculate Conversion',
        position: { x: 1100, y: 200 },
        parameters: {
          mode: 'expression',
          expression: 'amount * rate',
          outputField: 'convertedAmount'
        }
      },
      {
        id: 'code-2',
        type: 'code',
        name: 'Format Result',
        position: { x: 1350, y: 200 },
        parameters: {
          code: `const data = items[0]?.json || {};
const amount = data.amount || 0;
const rate = data.rate || 0;
const converted = data.convertedAmount || 0;
return [{ json: {
  result: amount + ' USD = ' + converted.toFixed(2) + ' EUR',
  rate: rate,
  rateDate: data.rateDate || new Date().toISOString()
} }];`
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'set-1' },
      { source: 'set-1', target: 'http-1' },
      { source: 'http-1', target: 'code-1' },
      { source: 'code-1', target: 'math-1' },
      { source: 'math-1', target: 'code-2' }
    ]
  },

  'demo-hacker-news': {
    name: '📰 Demo: Hacker News Top Stories',
    description: 'Fetch top tech stories from Hacker News via Algolia API. No API key needed.',
    category: 'Demo',
    tags: ['demo', 'news', 'tech', 'hn', 'aggregator'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Manual Trigger',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Fetch Top Stories',
        position: { x: 350, y: 200 },
        parameters: {
          method: 'GET',
          url: 'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=5',
          options: { timeout: 15000 }
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Format Stories',
        position: { x: 650, y: 200 },
        parameters: {
          code: `const response = items[0]?.json || {};
const data = response.body || {};
const hits = data.hits || [];
const stories = hits.map((h, i) => ({
  rank: i + 1,
  title: h.title || 'No title',
  author: h.author || 'unknown',
  points: h.points || 0,
  comments: h.num_comments || 0,
  url: h.url || 'https://news.ycombinator.com/item?id=' + h.objectID
}));
return [{ json: {
  storyCount: stories.length,
  stories,
  fetchedAt: new Date().toISOString()
} }];`
        }
      },
      {
        id: 'set-1',
        type: 'set',
        name: 'Add Timestamp',
        position: { x: 950, y: 200 },
        parameters: {
          mode: 'manual',
          values: [
            { name: 'summary', value: 'Top {{ $json.storyCount }} HN stories fetched' },
            { name: 'fetchedAt', value: '{{ $json.fetchedAt }}' }
          ]
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'http-1' },
      { source: 'http-1', target: 'code-1' },
      { source: 'code-1', target: 'set-1' }
    ]
  },

  // AI Templates
  ...Object.entries(aiAgentTemplates).reduce((acc, [key, value]) => ({
    ...acc,
    [`ai-${key}`]: {
      ...value,
      category: 'AI',
      tags: ['ai', 'agent', 'openai']
    }
  }), {}),

  // Data Processing Templates
  'data-csv-processor': {
    name: 'CSV Processor',
    description: 'Parse CSV files and process data',
    category: 'Data',
    tags: ['csv', 'data', 'transform'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'fileWatch',
        name: 'File Watch',
        position: { x: 100, y: 200 },
        parameters: {
          folderPath: '/data/incoming',
          pattern: '*.csv',
          readContent: true,
          encoding: 'utf8'
        }
      },
      {
        id: 'csv-1',
        type: 'csv',
        name: 'Parse CSV',
        position: { x: 400, y: 200 },
        parameters: {
          operation: 'parse',
          inputField: 'content',
          delimiter: ',',
          header: true
        }
      },
      {
        id: 'filter-1',
        type: 'filter',
        name: 'Filter Valid Rows',
        position: { x: 700, y: 200 },
        parameters: {
          mode: 'simple',
          field: 'status',
          operator: 'eq',
          value: 'active'
        }
      }
    ],
    connections: [
      { id: 'conn-1', source: 'trigger-1', target: 'csv-1' },
      { id: 'conn-2', source: 'csv-1', target: 'filter-1' }
    ]
  },

  // Integration Templates
  'integration-webhook-api': {
    name: 'Webhook to API',
    description: 'Receive webhook and forward to external API',
    category: 'Integration',
    tags: ['webhook', 'api', 'http'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'webhook',
        name: 'Webhook Trigger',
        position: { x: 100, y: 200 },
        parameters: {
          path: 'incoming-data',
          method: 'POST',
          responseMode: 'responseNode'
        }
      },
      {
        id: 'transform-1',
        type: 'set',
        name: 'Transform Data',
        position: { x: 400, y: 200 },
        parameters: {
          values: [
            { name: 'processedData', value: '{{ JSON.stringify($input) }}' }
          ]
        }
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Send to API',
        position: { x: 700, y: 200 },
        parameters: {
          method: 'POST',
          url: 'https://api.example.com/webhook',
          headers: {
            'Content-Type': 'application/json'
          },
          body: '{{ $json.processedData }}'
        }
      },
      {
        id: 'response-1',
        type: 'webhookResponse',
        name: 'Response',
        position: { x: 700, y: 400 },
        parameters: {
          statusCode: 200,
          contentType: 'application/json',
          responseMode: 'json',
          jsonData: { success: true, message: 'Received' }
        }
      }
    ],
    connections: [
      { id: 'conn-1', source: 'trigger-1', target: 'transform-1' },
      { id: 'conn-2', source: 'transform-1', target: 'http-1' },
      { id: 'conn-3', source: 'http-1', target: 'response-1' }
    ]
  },

  'integration-webhook-google-chat': {
    name: '💬 Webhook to Google Chat',
    description: 'Receive a webhook POST and forward a notification to a Google Chat space',
    category: 'Integration',
    tags: ['webhook', 'google-chat', 'notification'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'webhook',
        name: 'Webhook Trigger',
        position: { x: 100, y: 200 },
        parameters: {
          httpMethod: 'POST',
          path: 'notify-chat',
          responseMode: 'onReceived',
          responseCode: 200,
          responseData: '{"success": true}'
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Format Message',
        position: { x: 400, y: 200 },
        parameters: {
          code: `const body = items[0]?.json?.body || items[0]?.json || {};
const title = body.title || 'New Notification';
const message = body.message || JSON.stringify(body, null, 2);
const severity = body.severity || body.level || 'info';
return [{ json: { title, message, severity } }];`
        }
      },
      {
        id: 'chat-1',
        type: 'googleChat',
        name: 'Send to Google Chat',
        position: { x: 700, y: 200 },
        parameters: {
          webhookUrl: '',
          messageType: 'card',
          cardTitle: '{{ $input.title }}',
          cardSubtitle: 'Severity: {{ $input.severity }}',
          cardText: '{{ $input.message }}',
          cardImageUrl: '',
          useTemplate: true
        }
      }
    ],
    connections: [
      { id: 'conn-1', source: 'trigger-1', target: 'code-1' },
      { id: 'conn-2', source: 'code-1', target: 'chat-1' }
    ]
  },

  // Database Templates
  'db-sync-data': {
    name: 'Database Sync',
    description: 'Synchronize data between databases',
    category: 'Database',
    tags: ['database', 'sql', 'sync'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'scheduleTrigger',
        name: 'Schedule',
        position: { x: 100, y: 200 },
        parameters: {
          rule: '0 */6 * * *',
          timezone: 'UTC'
        }
      },
      {
        id: 'sql-source',
        type: 'sqlDatabase',
        name: 'Read Source DB',
        position: { x: 400, y: 200 },
        parameters: {
          operation: 'select',
          query: 'SELECT * FROM sync_table WHERE updated_at > NOW() - INTERVAL \'6 hours\''
        }
      },
      {
        id: 'transform-1',
        type: 'code',
        name: 'Transform',
        position: { x: 700, y: 200 },
        parameters: {
          code: `// Transform data for target\nconst rows = items;\nreturn rows.map(r => ({\n  json: {\n    ...r.json,\n    synced_at: new Date().toISOString()\n  }\n}));`
        }
      },
      {
        id: 'sql-target',
        type: 'sqlDatabase',
        name: 'Write Target DB',
        position: { x: 1000, y: 200 },
        parameters: {
          operation: 'insert',
          query: 'INSERT INTO sync_table (id, data, updated_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = $3'
        }
      }
    ],
    connections: [
      { id: 'conn-1', source: 'trigger-1', target: 'sql-source' },
      { id: 'conn-2', source: 'sql-source', target: 'transform-1' },
      { id: 'conn-3', source: 'transform-1', target: 'sql-target' }
    ]
  },

  // Notification Templates
  'notify-error-alert': {
    name: 'Error Alert System',
    description: 'Send alerts when errors occur',
    category: 'Notification',
    tags: ['email', 'alert', 'notification'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'webhook',
        name: 'Error Webhook',
        position: { x: 100, y: 200 },
        parameters: {
          path: 'error-report',
          method: 'POST'
        }
      },
      {
        id: 'format-1',
        type: 'code',
        name: 'Format Alert',
        position: { x: 400, y: 200 },
        parameters: {
          code: `const error = items[0]?.json || {};\nreturn [{\n  json: {\n    subject: 'Error: ' + (error.service || 'Unknown'),\n    body: \`\nService: \${error.service || 'N/A'}\nTime: \${error.timestamp || 'N/A'}\nError: \${error.message || 'N/A'}\nStack: \${error.stack || 'N/A'}\n    \`.trim()\n  }\n}];`
        }
      },
      {
        id: 'email-1',
        type: 'sendEmail',
        name: 'Send Alert Email',
        position: { x: 700, y: 200 },
        parameters: {
          from: 'alerts@company.com',
          to: 'admin@company.com',
          subject: '{{ $json.subject }}',
          body: '{{ $json.body }}',
          bodyType: 'text'
        }
      }
    ],
    connections: [
      { id: 'conn-1', source: 'trigger-1', target: 'format-1' },
      { id: 'conn-2', source: 'format-1', target: 'email-1' }
    ]
  },

  // SMB/CIFS File Share
  'file-smb-report-backup': {
    name: '🗂️ SMB: Daily Report Backup',
    description: 'Generate a daily summary report and upload it to an SMB/CIFS file share. Requires an SMB credential with host, share, and NTLMv2 or Kerberos auth.',
    category: 'File',
    tags: ['smb', 'cifs', 'file', 'backup', 'report'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'scheduleTrigger',
        name: 'Daily at 6 AM',
        description: 'Runs every morning',
        position: { x: 100, y: 200 },
        parameters: {
          rule: '0 6 * * *',
          timezone: 'Europe/Stockholm'
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Build Report',
        description: 'Generates a plain-text daily summary',
        position: { x: 380, y: 200 },
        parameters: {
          code: `const now = new Date();
const date = now.toISOString().slice(0, 10);
const time = now.toTimeString().slice(0, 8);
const filename = \`report-\${date}.txt\`;
const content = [
  '=== Daily Report ===',
  \`Date: \${date}\`,
  \`Generated: \${time} UTC\`,
  '',
  'Summary',
  '-------',
  'This report was automatically generated by OrdoVertex.',
  'Replace this section with real data from your workflow.',
  '',
  '=== End of Report ==='
].join('\\n');
return [{ json: { filename, content, date } }];`
        }
      },
      {
        id: 'smb-upload',
        type: 'smb',
        name: 'Upload to Share',
        description: 'Writes the report file to the SMB share',
        position: { x: 660, y: 200 },
        parameters: {
          useCredential: true,
          credentialId: '',
          operation: 'upload',
          remotePath: '{{ $json.filename }}',
          data: '{{ $json.content }}',
          binary: false
        }
      },
      {
        id: 'smb-list',
        type: 'smb',
        name: 'List Share',
        description: 'Confirms the file was written by listing the share root',
        position: { x: 940, y: 200 },
        parameters: {
          useCredential: true,
          credentialId: '',
          operation: 'list',
          remotePath: ''
        }
      },
      {
        id: 'code-2',
        type: 'code',
        name: 'Log Result',
        description: 'Emits a summary of what was uploaded',
        position: { x: 1220, y: 200 },
        parameters: {
          code: `const files = items[0]?.json?.files || [];
const uploaded = items[0]?.json?.filename || 'unknown';
return [{ json: {
  status: 'success',
  uploaded,
  shareContents: files,
  filesOnShare: files.length
} }];`
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'code-1' },
      { source: 'code-1', target: 'smb-upload' },
      { source: 'smb-upload', target: 'smb-list' },
      { source: 'smb-list', target: 'code-2' }
    ]
  },

  // File Processing
  'file-sftp-sync': {
    name: 'SFTP File Sync',
    description: 'Download files from SFTP and process them',
    category: 'File',
    tags: ['sftp', 'file', 'sync'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'sftpTrigger',
        name: 'SFTP Watch',
        position: { x: 100, y: 200 },
        parameters: {
          remotePath: '/uploads',
          pattern: '*.xml',
          downloadContent: true,
          encoding: 'utf8',
          moveAfterRead: '/processed'
        }
      },
      {
        id: 'parse-1',
        type: 'code',
        name: 'Parse XML',
        position: { x: 400, y: 200 },
        parameters: {
          code: `// Parse XML content\nconst xml = items[0]?.json?.content || '';\n// Add XML parsing logic here\nreturn [{ json: { parsed: xml } }];`
        }
      },
      {
        id: 'transform-1',
        type: 'set',
        name: 'Transform',
        position: { x: 700, y: 200 },
        parameters: {
          values: [
            { name: 'output', value: '{{ JSON.stringify($input) }}' }
          ]
        }
      }
    ],
    connections: [
      { id: 'conn-1', source: 'trigger-1', target: 'parse-1' },
      { id: 'conn-2', source: 'parse-1', target: 'transform-1' }
    ]
  },

  // LDAP/Auth Templates
  'ldap-user-sync': {
    name: 'LDAP User Sync',
    description: 'Synchronize users from LDAP/Active Directory',
    category: 'Authentication',
    tags: ['ldap', 'auth', 'users'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'scheduleTrigger',
        name: 'Daily Sync',
        position: { x: 100, y: 200 },
        parameters: {
          rule: '0 2 * * *',
          timezone: 'UTC'
        }
      },
      {
        id: 'ldap-1',
        type: 'ldap',
        name: 'Search Users',
        position: { x: 400, y: 200 },
        parameters: {
          operation: 'search',
          baseDn: 'ou=users,dc=company,dc=com',
          filter: '(objectClass=person)',
          scope: 'sub',
          attributes: ['cn', 'mail', 'department']
        }
      },
      {
        id: 'transform-1',
        type: 'code',
        name: 'Format Users',
        position: { x: 700, y: 200 },
        parameters: {
          code: `const data = items[0]?.json || {};\nconst entries = data.entries || [];\nconst users = entries.map(e => ({\n  name: e.attributes?.cn?.[0],\n  email: e.attributes?.mail?.[0],\n  department: e.attributes?.department?.[0]\n}));\nreturn [{ json: { users } }];`
        }
      }
    ],
    connections: [
      { id: 'conn-1', source: 'trigger-1', target: 'ldap-1' },
      { id: 'conn-2', source: 'ldap-1', target: 'transform-1' }
    ]
  },

  // Slack & Teams Templates
  'integration-slack-notification': {
    name: '💬 Slack Notification',
    description: 'Send a formatted message to a Slack channel via incoming webhook. Requires a Slack webhook credential.',
    category: 'Integration',
    tags: ['slack', 'notification', 'webhook'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Send Notification',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'set-1',
        type: 'set',
        name: 'Set Message',
        position: { x: 350, y: 200 },
        parameters: {
          mode: 'manual',
          values: [
            { name: 'title', value: 'Hello from OrdoVertex' },
            { name: 'message', value: 'This is a test notification sent via Slack webhook.' },
            { name: 'color', value: '#36a64f' }
          ]
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Build Slack Payload',
        position: { x: 620, y: 200 },
        parameters: {
          code: `const title = items[0]?.json?.title || 'Notification';
const message = items[0]?.json?.message || '';
const color = items[0]?.json?.color || '#36a64f';
const payload = {
  attachments: [{
    color,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: title } },
      { type: 'section', text: { type: 'mrkdwn', text: message } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: 'Sent by *OrdoVertex* at ' + new Date().toLocaleString() }] }
    ]
  }]
};
return [{ json: { payload: JSON.stringify(payload) } }];`
        }
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Post to Slack',
        position: { x: 900, y: 200 },
        parameters: {
          method: 'POST',
          url: '{{ $credentials.webhookUrl }}',
          useCredential: true,
          credentialId: '',
          headers: { 'Content-Type': 'application/json' },
          body: '{{ $input.payload }}'
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'set-1' },
      { source: 'set-1', target: 'code-1' },
      { source: 'code-1', target: 'http-1' }
    ]
  },

  'integration-slack-alert': {
    name: '🚨 Slack Alert on Webhook',
    description: 'Receive a webhook event and forward a formatted alert to Slack. Good for CI/CD notifications, monitoring, or error alerts.',
    category: 'Integration',
    tags: ['slack', 'alert', 'webhook', 'devops'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'webhook',
        name: 'Receive Event',
        position: { x: 100, y: 200 },
        parameters: {
          httpMethod: 'POST',
          path: 'slack-alert',
          responseMode: 'onReceived',
          responseCode: 200,
          responseData: '{"ok":true}'
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Build Slack Payload',
        position: { x: 400, y: 200 },
        parameters: {
          code: `const body = items[0]?.json?.body || items[0]?.json || {};
const title = body.title || body.summary || 'New Event';
const message = body.message || body.description || JSON.stringify(body, null, 2).substring(0, 500);
const level = body.level || body.severity || 'info';
const colors = { critical: '#ff0000', error: '#ff0000', warning: '#ffaa00', info: '#36a64f', success: '#36a64f' };
const color = colors[level] || '#36a64f';
const emoji = { critical: '🚨', error: '❌', warning: '⚠️', info: 'ℹ️', success: '✅' }[level] || 'ℹ️';
const payload = {
  attachments: [{
    color,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: emoji + ' ' + title } },
      { type: 'section', text: { type: 'mrkdwn', text: message } },
      { type: 'section', fields: [
        { type: 'mrkdwn', text: '*Level:*\\n' + level },
        { type: 'mrkdwn', text: '*Time:*\\n' + new Date().toLocaleString() }
      ]},
    ]
  }]
};
return [{ json: { payload: JSON.stringify(payload) } }];`
        }
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Post to Slack',
        position: { x: 700, y: 200 },
        parameters: {
          method: 'POST',
          url: '{{ $credentials.webhookUrl }}',
          useCredential: true,
          credentialId: '',
          headers: { 'Content-Type': 'application/json' },
          body: '{{ $input.payload }}'
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'code-1' },
      { source: 'code-1', target: 'http-1' }
    ]
  },

  'integration-teams-notification': {
    name: '🟦 Microsoft Teams Notification',
    description: 'Send a formatted Adaptive Card message to a Microsoft Teams channel via incoming webhook. Requires a Teams webhook credential.',
    category: 'Integration',
    tags: ['teams', 'microsoft', 'notification', 'webhook'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Send Notification',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'set-1',
        type: 'set',
        name: 'Set Message',
        position: { x: 350, y: 200 },
        parameters: {
          mode: 'manual',
          values: [
            { name: 'title', value: 'Hello from OrdoVertex' },
            { name: 'message', value: 'This is a test notification sent via Microsoft Teams webhook.' },
            { name: 'themeColor', value: '0076D7' }
          ]
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Build Teams Payload',
        position: { x: 620, y: 200 },
        parameters: {
          code: `const title = items[0]?.json?.title || 'Notification';
const message = items[0]?.json?.message || '';
const themeColor = items[0]?.json?.themeColor || '0076D7';
const payload = {
  "@type": "MessageCard",
  "@context": "http://schema.org/extensions",
  "themeColor": themeColor,
  "summary": title,
  "sections": [{
    "activityTitle": title,
    "activityText": message,
    "facts": [
      { "name": "Source", "value": "OrdoVertex" },
      { "name": "Time", "value": new Date().toLocaleString() }
    ],
    "markdown": true
  }]
};
return [{ json: { payload: JSON.stringify(payload) } }];`
        }
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Post to Teams',
        position: { x: 900, y: 200 },
        parameters: {
          method: 'POST',
          url: '{{ $credentials.webhookUrl }}',
          useCredential: true,
          credentialId: '',
          headers: { 'Content-Type': 'application/json' },
          body: '{{ $input.payload }}'
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'set-1' },
      { source: 'set-1', target: 'code-1' },
      { source: 'code-1', target: 'http-1' }
    ]
  },

  'integration-teams-alert': {
    name: '🚨 Microsoft Teams Alert on Webhook',
    description: 'Receive a webhook event and forward a formatted alert card to Microsoft Teams. Good for monitoring, CI/CD, or error notifications.',
    category: 'Integration',
    tags: ['teams', 'microsoft', 'alert', 'webhook', 'devops'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'webhook',
        name: 'Receive Event',
        position: { x: 100, y: 200 },
        parameters: {
          httpMethod: 'POST',
          path: 'teams-alert',
          responseMode: 'onReceived',
          responseCode: 200,
          responseData: '{"ok":true}'
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Build Teams Payload',
        position: { x: 400, y: 200 },
        parameters: {
          code: `const body = items[0]?.json?.body || items[0]?.json || {};
const title = body.title || body.summary || 'New Event';
const message = body.message || body.description || JSON.stringify(body).substring(0, 500);
const level = body.level || body.severity || 'info';
const colors = { critical: 'FF0000', error: 'FF0000', warning: 'FFA500', info: '0076D7', success: '00AA00' };
const themeColor = colors[level] || '0076D7';
const payload = {
  "@type": "MessageCard",
  "@context": "http://schema.org/extensions",
  "themeColor": themeColor,
  "summary": title,
  "sections": [{
    "activityTitle": title,
    "activityText": message,
    "facts": [
      { "name": "Severity", "value": level },
      { "name": "Source", "value": body.source || body.service || 'OrdoVertex' },
      { "name": "Time", "value": new Date().toLocaleString() }
    ],
    "markdown": true
  }]
};
return [{ json: { payload: JSON.stringify(payload) } }];`
        }
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Post to Teams',
        position: { x: 700, y: 200 },
        parameters: {
          method: 'POST',
          url: '{{ $credentials.webhookUrl }}',
          useCredential: true,
          credentialId: '',
          headers: { 'Content-Type': 'application/json' },
          body: '{{ $input.payload }}'
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'code-1' },
      { source: 'code-1', target: 'http-1' }
    ]
  },

  // Advanced Demo Templates
  'advanced-ai-triage-bot': {
    name: '🤖 AI Support Triage Bot',
    description: 'Webhook receives a support ticket, AI classifies severity and category, then routes to Google Chat or email. Requires an AI credential.',
    category: 'Advanced',
    tags: ['ai', 'triage', 'webhook', 'routing', 'google-chat', 'email'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'webhook',
        name: 'Receive Ticket',
        position: { x: 100, y: 300 },
        parameters: {
          httpMethod: 'POST',
          path: 'support-ticket',
          responseMode: 'onReceived',
          responseCode: 200,
          responseData: '{"received":true}'
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Extract Ticket',
        position: { x: 350, y: 300 },
        parameters: {
          code: `const body = items[0]?.json?.body || items[0]?.json || {};
const ticket = {
  id: body.id || 'TICKET-' + Date.now(),
  subject: body.subject || body.title || 'No subject',
  description: body.description || body.message || body.body || '',
  submitter: body.email || body.user || 'unknown@example.com',
  submittedAt: new Date().toISOString()
};
return [{ json: { ticket, message: ticket.subject + '\\n\\n' + ticket.description } }];`
        }
      },
      {
        id: 'agent-1',
        type: 'aiAgent',
        name: 'Classify Ticket',
        position: { x: 620, y: 300 },
        parameters: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          useCredential: true,
          credentialId: '',
          temperature: 0.1,
          maxTokens: 300,
          systemPrompt: 'You are a support ticket classifier. Given a ticket subject and description, respond ONLY with a valid JSON object (no markdown, no extra text) in this exact format: {"severity":"critical"|"high"|"medium"|"low","category":"billing"|"technical"|"account"|"feature-request"|"other","summary":"one sentence summary","suggested_action":"what should be done"}',
          enableMemory: false,
          enableTools: false,
          jsonMode: true,
          maxIterations: 3
        }
      },
      {
        id: 'code-2',
        type: 'code',
        name: 'Parse Classification',
        position: { x: 900, y: 300 },
        parameters: {
          code: `const ticket = items[0]?.json?.ticket || {};
const agentOutput = items[0]?.json?.output || items[0]?.json?.response || '{}';
let classification = {};
try {
  const raw = typeof agentOutput === 'string' ? agentOutput : JSON.stringify(agentOutput);
  const jsonMatch = raw.match(/\\{[\\s\\S]*\\}/);
  classification = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
} catch(e) { classification = { severity: 'medium', category: 'other', summary: 'Could not classify', suggested_action: 'Manual review needed' }; }
const isCritical = classification.severity === 'critical' || classification.severity === 'high';
return [{ json: { ticket, classification, isCritical, severity: classification.severity || 'medium' } }];`
        }
      },
      {
        id: 'if-1',
        type: 'if',
        name: 'Critical?',
        position: { x: 1150, y: 300 },
        parameters: {
          mode: 'simple',
          field: 'isCritical',
          operator: 'eq',
          value: 'true'
        }
      },
      {
        id: 'chat-1',
        type: 'googleChat',
        name: '🚨 Alert Google Chat',
        position: { x: 1400, y: 150 },
        parameters: {
          webhookUrl: '',
          messageType: 'card',
          cardTitle: '🚨 Critical Ticket: {{ $input.ticket.id }}',
          cardSubtitle: 'Severity: {{ $input.severity }} | Category: {{ $input.classification.category }}',
          cardText: '**{{ $input.ticket.subject }}**\n\n{{ $input.classification.summary }}\n\nAction: {{ $input.classification.suggested_action }}\nFrom: {{ $input.ticket.submitter }}',
          useTemplate: true
        }
      },
      {
        id: 'email-1',
        type: 'sendEmail',
        name: '📧 Queue Email',
        position: { x: 1400, y: 450 },
        parameters: {
          useCredential: true,
          credentialId: '',
          to: 'support@example.com',
          subject: '[{{ $input.severity }}] {{ $input.ticket.subject }}',
          body: 'Ticket: {{ $input.ticket.id }}\nFrom: {{ $input.ticket.submitter }}\nSeverity: {{ $input.severity }}\nCategory: {{ $input.classification.category }}\n\nSummary: {{ $input.classification.summary }}\nAction: {{ $input.classification.suggested_action }}\n\n---\n{{ $input.ticket.description }}'
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'code-1' },
      { source: 'code-1', target: 'agent-1' },
      { source: 'agent-1', target: 'code-2' },
      { source: 'code-2', target: 'if-1' },
      { source: 'if-1', sourceHandle: 'true', target: 'chat-1' },
      { source: 'if-1', sourceHandle: 'false', target: 'email-1' }
    ]
  },

  'advanced-document-summarizer': {
    name: '📄 AI Document Summarizer',
    description: 'Fetch an RSS feed or web page, split into chunks, summarize with AI, and send a digest to Google Chat or email. Requires an AI credential.',
    category: 'Advanced',
    tags: ['ai', 'summarize', 'rss', 'digest', 'google-chat'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'scheduleTrigger',
        name: 'Daily Digest',
        position: { x: 100, y: 200 },
        parameters: { cronExpression: '0 8 * * *', timezone: 'Europe/Stockholm' }
      },
      {
        id: 'http-1',
        type: 'httpRequest',
        name: 'Fetch RSS Feed',
        position: { x: 350, y: 200 },
        parameters: {
          method: 'GET',
          url: 'https://feeds.feedburner.com/TheHackersNews'
        }
      },
      {
        id: 'parser-1',
        type: 'textParser',
        name: 'Parse RSS',
        position: { x: 600, y: 200 },
        parameters: {
          parseMode: 'rss',
          sourceField: '{{ $input.body }}',
          maxResults: 8
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Prepare for AI',
        position: { x: 850, y: 200 },
        parameters: {
          code: `const data = items[0]?.json || {};
const articles = data.items || data.articles || [];
const text = articles.slice(0, 8).map((a, i) =>
  (i+1) + '. ' + (a.title || '') + ': ' + (a.description || a.summary || '').substring(0, 200)
).join('\\n\\n');
return [{ json: { message: 'Summarize these news articles into a concise daily digest with key themes and the 3 most important stories:\\n\\n' + text, articleCount: articles.length } }];`
        }
      },
      {
        id: 'agent-1',
        type: 'aiAgent',
        name: 'Summarize with AI',
        position: { x: 1100, y: 200 },
        parameters: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          useCredential: true,
          credentialId: '',
          temperature: 0.4,
          maxTokens: 600,
          systemPrompt: 'You are a news digest editor. Write clear, concise summaries. Format output as: 📌 Key Themes: [themes]\n\n🔥 Top Stories:\n1. [story]\n2. [story]\n3. [story]\n\n📊 Summary: [2-3 sentence overview]',
          enableMemory: false,
          enableTools: false,
          maxIterations: 3
        }
      },
      {
        id: 'chat-1',
        type: 'googleChat',
        name: 'Post Digest',
        position: { x: 1350, y: 200 },
        parameters: {
          webhookUrl: '',
          messageType: 'card',
          cardTitle: '📰 Daily Security Digest',
          cardSubtitle: 'AI-powered summary',
          cardText: '{{ $input.output }}',
          useTemplate: true
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'http-1' },
      { source: 'http-1', target: 'parser-1' },
      { source: 'parser-1', target: 'code-1' },
      { source: 'code-1', target: 'agent-1' },
      { source: 'agent-1', target: 'chat-1' }
    ]
  },

  'advanced-ai-sql-query': {
    name: '🧠 AI Natural Language → SQL',
    description: 'Type a question in plain English, AI generates the SQL query, executes it against your database, and returns results. Requires AI and database credentials.',
    category: 'Advanced',
    tags: ['ai', 'sql', 'database', 'natural-language'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'manualTrigger',
        name: 'Ask a Question',
        position: { x: 100, y: 200 },
        parameters: {}
      },
      {
        id: 'set-1',
        type: 'set',
        name: 'Set Question',
        position: { x: 350, y: 200 },
        parameters: {
          mode: 'manual',
          values: [
            { name: 'message', value: 'Show me the 5 most recently created users and their email addresses' },
            { name: 'schema_hint', value: 'Tables: users(id, name, email, role, created_at), workflows(id, name, user_id, active, created_at), executions(id, workflow_id, status, started_at, finished_at)' }
          ]
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Build AI Prompt',
        position: { x: 600, y: 200 },
        parameters: {
          code: `const q = items[0]?.json?.message || '';
const schema = items[0]?.json?.schema_hint || '';
return [{ json: { message: 'Database schema: ' + schema + '\\n\\nGenerate a safe, read-only PostgreSQL SELECT query for this request: ' + q + '\\n\\nRespond with ONLY the SQL query, no explanation, no markdown.' } }];`
        }
      },
      {
        id: 'agent-1',
        type: 'aiAgent',
        name: 'Generate SQL',
        position: { x: 850, y: 200 },
        parameters: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          useCredential: true,
          credentialId: '',
          temperature: 0.1,
          maxTokens: 300,
          systemPrompt: 'You are a PostgreSQL expert. Generate safe, read-only SELECT queries only. Never generate INSERT, UPDATE, DELETE, DROP, or any data-modifying statements. Return only the SQL query with no explanation.',
          enableMemory: false,
          enableTools: false,
          maxIterations: 3
        }
      },
      {
        id: 'code-2',
        type: 'code',
        name: 'Extract SQL',
        position: { x: 1100, y: 200 },
        parameters: {
          code: `const output = items[0]?.json?.output || items[0]?.json?.response || '';
const sql = (typeof output === 'string' ? output : JSON.stringify(output))
  .replace(/\`\`\`sql/gi, '').replace(/\`\`\`/g, '').trim();
// Safety check — only allow SELECT
if (!sql.trim().toUpperCase().startsWith('SELECT')) {
  throw new Error('AI generated a non-SELECT statement. Blocked for safety: ' + sql.substring(0, 100));
}
return [{ json: { query: sql, generatedAt: new Date().toISOString() } }];`
        }
      },
      {
        id: 'sql-1',
        type: 'sqlDatabase',
        name: 'Execute Query',
        position: { x: 1350, y: 200 },
        parameters: {
          useCredential: true,
          credentialId: '',
          dbType: 'postgresql',
          operation: 'query',
          query: '{{ $input.query }}'
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'set-1' },
      { source: 'set-1', target: 'code-1' },
      { source: 'code-1', target: 'agent-1' },
      { source: 'agent-1', target: 'code-2' },
      { source: 'code-2', target: 'sql-1' }
    ]
  },

  'advanced-csv-to-db-etl': {
    name: '📊 CSV to Database ETL',
    description: 'Download a CSV from SFTP, parse and validate rows, insert into a SQL database, and send a completion report via email. Requires SFTP, database, and SMTP credentials.',
    category: 'Advanced',
    tags: ['csv', 'etl', 'sftp', 'database', 'email'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'scheduleTrigger',
        name: 'Run ETL',
        position: { x: 100, y: 200 },
        parameters: { cronExpression: '0 3 * * *', timezone: 'Europe/Stockholm' }
      },
      {
        id: 'sftp-1',
        type: 'sftp',
        name: 'Download CSV',
        position: { x: 350, y: 200 },
        parameters: {
          useCredential: true,
          credentialId: '',
          operation: 'get',
          remotePath: '/incoming/data.csv',
          encoding: 'utf8'
        }
      },
      {
        id: 'csv-1',
        type: 'csv',
        name: 'Parse CSV',
        position: { x: 600, y: 200 },
        parameters: {
          operation: 'parse',
          inputField: 'content',
          delimiter: ',',
          header: true
        }
      },
      {
        id: 'filter-1',
        type: 'filter',
        name: 'Valid Rows Only',
        position: { x: 850, y: 200 },
        parameters: {
          mode: 'simple',
          field: 'email',
          operator: 'exists',
          value: ''
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Transform Rows',
        position: { x: 1100, y: 200 },
        parameters: {
          code: `const rows = items.map(item => {
  const r = item.json || {};
  return { json: {
    name: (r.name || r.full_name || '').trim(),
    email: (r.email || '').toLowerCase().trim(),
    department: r.department || r.dept || 'Unknown',
    imported_at: new Date().toISOString()
  }};
});
return rows;`
        }
      },
      {
        id: 'sql-1',
        type: 'sqlDatabase',
        name: 'Insert to DB',
        position: { x: 1350, y: 200 },
        parameters: {
          useCredential: true,
          credentialId: '',
          dbType: 'postgresql',
          operation: 'query',
          query: "INSERT INTO imported_users (name, email, department, imported_at) VALUES ('{{ $json.name }}', '{{ $json.email }}', '{{ $json.department }}', '{{ $json.imported_at }}') ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, department = EXCLUDED.department, imported_at = EXCLUDED.imported_at"
        }
      },
      {
        id: 'code-2',
        type: 'code',
        name: 'Build Report',
        position: { x: 1600, y: 200 },
        parameters: {
          code: `const count = items.length;
return [{ json: {
  to: 'admin@example.com',
  subject: 'ETL Complete: ' + count + ' rows imported',
  body: 'CSV ETL job completed at ' + new Date().toLocaleString() + '\\n\\nRows processed: ' + count + '\\nSource: /incoming/data.csv'
} }];`
        }
      },
      {
        id: 'email-1',
        type: 'sendEmail',
        name: 'Send Report',
        position: { x: 1850, y: 200 },
        parameters: {
          useCredential: true,
          credentialId: '',
          to: '{{ $input.to }}',
          subject: '{{ $input.subject }}',
          body: '{{ $input.body }}'
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'sftp-1' },
      { source: 'sftp-1', target: 'csv-1' },
      { source: 'csv-1', target: 'filter-1' },
      { source: 'filter-1', target: 'code-1' },
      { source: 'code-1', target: 'sql-1' },
      { source: 'sql-1', target: 'code-2' },
      { source: 'code-2', target: 'email-1' }
    ]
  },

  'advanced-multi-source-digest': {
    name: '🌐 Multi-Source Daily Digest',
    description: 'Every morning: fetch weather, crypto prices, and top news, aggregate into one report, and send to Google Chat. No API keys needed.',
    category: 'Advanced',
    tags: ['digest', 'scheduled', 'weather', 'crypto', 'news', 'google-chat'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'scheduleTrigger',
        name: 'Morning Digest',
        position: { x: 100, y: 300 },
        parameters: { cronExpression: '0 7 * * 1-5', timezone: 'Europe/Stockholm' }
      },
      {
        id: 'http-weather',
        type: 'httpRequest',
        name: 'Get Weather',
        position: { x: 380, y: 100 },
        parameters: {
          method: 'GET',
          url: 'https://wttr.in/Stockholm?format=j1',
          options: { headers: { 'User-Agent': 'curl/7.64.1' } }
        }
      },
      {
        id: 'http-crypto',
        type: 'httpRequest',
        name: 'Get Crypto',
        position: { x: 380, y: 300 },
        parameters: {
          method: 'GET',
          url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true'
        }
      },
      {
        id: 'http-news',
        type: 'httpRequest',
        name: 'Get News',
        position: { x: 380, y: 500 },
        parameters: {
          method: 'GET',
          url: 'https://feeds.feedburner.com/TheHackersNews'
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Aggregate All',
        position: { x: 720, y: 300 },
        parameters: {
          code: `const all = items.map(i => i?.json?.body || i?.json || {});
const weather = all.find(d => d.current_condition) || {};
const crypto = all.find(d => d.bitcoin) || {};
const newsXml = all.find(d => typeof d === 'string' || (d && typeof d.toString === 'function')) || '';

const cond = weather.current_condition?.[0] || {};
const weatherStr = cond.temp_C ? cond.temp_C + '°C, ' + (cond.weatherDesc?.[0]?.value || '') : 'N/A';

const btc = crypto.bitcoin ? '$' + crypto.bitcoin.usd.toLocaleString() + ' (' + (crypto.bitcoin.usd_24h_change || 0).toFixed(1) + '%)' : 'N/A';
const eth = crypto.ethereum ? '$' + crypto.ethereum.usd.toLocaleString() + ' (' + (crypto.ethereum.usd_24h_change || 0).toFixed(1) + '%)' : 'N/A';

const xmlText = typeof newsXml === 'string' ? newsXml : JSON.stringify(newsXml);
const titles = [];
const titleRe = /<title><!\\[CDATA\\[([^\\]]+)\\]\\]><\\/title>|<title>([^<]+)<\\/title>/g;
let m; let count = 0;
while ((m = titleRe.exec(xmlText)) !== null && count < 3) {
  const t = (m[1] || m[2] || '').trim();
  if (t && !t.toLowerCase().includes('hacker news')) { titles.push(t); count++; }
}

const report = '☀️ *Stockholm:* ' + weatherStr +
  '\\n₿ *BTC:* ' + btc + '  |  *ETH:* ' + eth +
  '\\n\\n📰 *Top Stories:*\\n' + titles.map((t,i) => (i+1)+'. '+t).join('\\n');

return [{ json: { report, date: new Date().toLocaleDateString('sv-SE') } }];`
        }
      },
      {
        id: 'chat-1',
        type: 'googleChat',
        name: 'Post Digest',
        position: { x: 1000, y: 300 },
        parameters: {
          webhookUrl: '',
          messageType: 'card',
          cardTitle: '🌅 Morning Digest — {{ $input.date }}',
          cardSubtitle: 'Weather · Crypto · News',
          cardText: '{{ $input.report }}',
          useTemplate: true
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'http-weather' },
      { source: 'trigger-1', target: 'http-crypto' },
      { source: 'trigger-1', target: 'http-news' },
      { source: 'http-weather', target: 'code-1' },
      { source: 'http-crypto', target: 'code-1' },
      { source: 'http-news', target: 'code-1' },
      { source: 'code-1', target: 'chat-1' }
    ]
  },

  'advanced-db-change-monitor': {
    name: '🔍 Database Change Monitor',
    description: 'Scheduled query checks for new or updated rows in a table, deduplicates, and sends alerts to Google Chat when changes are detected. Requires database and webhook credentials.',
    category: 'Advanced',
    tags: ['database', 'monitor', 'scheduled', 'alert', 'google-chat'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'scheduleTrigger',
        name: 'Check Every 15 Min',
        position: { x: 100, y: 200 },
        parameters: { cronExpression: '*/15 * * * *', timezone: 'Europe/Stockholm' }
      },
      {
        id: 'sql-1',
        type: 'sqlDatabase',
        name: 'Query New Rows',
        position: { x: 370, y: 200 },
        parameters: {
          useCredential: true,
          credentialId: '',
          dbType: 'postgresql',
          operation: 'query',
          query: "SELECT id, name, email, created_at FROM users WHERE created_at > NOW() - INTERVAL '15 minutes' ORDER BY created_at DESC LIMIT 50"
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Check for Changes',
        position: { x: 650, y: 200 },
        parameters: {
          code: `const rows = items.map(i => i.json).filter(r => r && r.id);
if (rows.length === 0) {
  return [{ json: { hasChanges: false, count: 0, message: 'No new rows' } }];
}
const summary = rows.slice(0, 5).map(r => '• ' + (r.name || r.id) + (r.email ? ' <' + r.email + '>' : '')).join('\\n');
return [{ json: { hasChanges: true, count: rows.length, summary, checkedAt: new Date().toISOString() } }];`
        }
      },
      {
        id: 'if-1',
        type: 'if',
        name: 'Has Changes?',
        position: { x: 920, y: 200 },
        parameters: {
          mode: 'simple',
          field: 'hasChanges',
          operator: 'eq',
          value: 'true'
        }
      },
      {
        id: 'chat-1',
        type: 'googleChat',
        name: 'Alert Google Chat',
        position: { x: 1180, y: 100 },
        parameters: {
          webhookUrl: '',
          messageType: 'card',
          cardTitle: '🔔 {{ $input.count }} new row(s) detected',
          cardSubtitle: 'Checked at {{ $input.checkedAt }}',
          cardText: '{{ $input.summary }}',
          useTemplate: true
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'sql-1' },
      { source: 'sql-1', target: 'code-1' },
      { source: 'code-1', target: 'if-1' },
      { source: 'if-1', sourceHandle: 'true', target: 'chat-1' }
    ]
  },

  'advanced-security-alert-pipeline': {
    name: '🛡️ Security Alert Pipeline',
    description: 'Webhook receives a log event, AI analyzes it for threats, and fires alerts to Google Chat and email when suspicious activity is detected. Requires AI, webhook, and SMTP credentials.',
    category: 'Advanced',
    tags: ['security', 'ai', 'alert', 'webhook', 'google-chat', 'email'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'webhook',
        name: 'Receive Log Event',
        position: { x: 100, y: 300 },
        parameters: {
          httpMethod: 'POST',
          path: 'security-log',
          responseMode: 'onReceived',
          responseCode: 200,
          responseData: '{"received":true}'
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Extract Event',
        position: { x: 370, y: 300 },
        parameters: {
          code: `const body = items[0]?.json?.body || items[0]?.json || {};
const event = {
  timestamp: body.timestamp || new Date().toISOString(),
  source_ip: body.source_ip || body.ip || 'unknown',
  user: body.user || body.username || 'unknown',
  action: body.action || body.event || body.type || 'unknown',
  resource: body.resource || body.path || body.url || 'unknown',
  status: body.status || body.result || 'unknown',
  raw: JSON.stringify(body).substring(0, 500)
};
return [{ json: { event, message: 'Analyze this security log event for threats:\\n' + JSON.stringify(event, null, 2) } }];`
        }
      },
      {
        id: 'agent-1',
        type: 'aiAgent',
        name: 'Analyze Threat',
        position: { x: 640, y: 300 },
        parameters: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          useCredential: true,
          credentialId: '',
          temperature: 0.1,
          maxTokens: 300,
          systemPrompt: 'You are a security analyst. Analyze log events and respond ONLY with JSON (no markdown): {"threat_level":"critical"|"high"|"medium"|"low"|"none","threat_type":"brute_force"|"injection"|"privilege_escalation"|"data_exfiltration"|"anomaly"|"normal","explanation":"brief explanation","recommended_action":"what to do"}',
          enableMemory: false,
          enableTools: false,
          jsonMode: true,
          maxIterations: 3
        }
      },
      {
        id: 'code-2',
        type: 'code',
        name: 'Parse Threat Level',
        position: { x: 910, y: 300 },
        parameters: {
          code: `const event = items[0]?.json?.event || {};
const output = items[0]?.json?.output || items[0]?.json?.response || '{}';
let analysis = {};
try {
  const raw = typeof output === 'string' ? output : JSON.stringify(output);
  const jsonMatch = raw.match(/\\{[\\s\\S]*\\}/);
  analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
} catch(e) { analysis = { threat_level: 'medium', threat_type: 'anomaly', explanation: 'Parse error', recommended_action: 'Manual review' }; }
const isAlert = ['critical','high'].includes(analysis.threat_level);
return [{ json: { event, analysis, isAlert, threat_level: analysis.threat_level || 'unknown' } }];`
        }
      },
      {
        id: 'if-1',
        type: 'if',
        name: 'Threat Detected?',
        position: { x: 1160, y: 300 },
        parameters: {
          mode: 'simple',
          field: 'isAlert',
          operator: 'eq',
          value: 'true'
        }
      },
      {
        id: 'chat-1',
        type: 'googleChat',
        name: '🚨 Security Alert',
        position: { x: 1420, y: 150 },
        parameters: {
          webhookUrl: '',
          messageType: 'card',
          cardTitle: '🚨 Security Alert: {{ $input.analysis.threat_type }}',
          cardSubtitle: 'Level: {{ $input.threat_level }} | IP: {{ $input.event.source_ip }}',
          cardText: '{{ $input.analysis.explanation }}\n\nAction: {{ $input.analysis.recommended_action }}\nUser: {{ $input.event.user }}\nResource: {{ $input.event.resource }}',
          useTemplate: true
        }
      },
      {
        id: 'email-1',
        type: 'sendEmail',
        name: '📧 Security Email',
        position: { x: 1420, y: 400 },
        parameters: {
          useCredential: true,
          credentialId: '',
          to: 'security@example.com',
          subject: '[{{ $input.threat_level }}] Security Alert: {{ $input.analysis.threat_type }}',
          body: 'Threat Level: {{ $input.threat_level }}\nType: {{ $input.analysis.threat_type }}\nSource IP: {{ $input.event.source_ip }}\nUser: {{ $input.event.user }}\nResource: {{ $input.event.resource }}\nTime: {{ $input.event.timestamp }}\n\nAnalysis: {{ $input.analysis.explanation }}\nRecommended Action: {{ $input.analysis.recommended_action }}\n\nRaw Event:\n{{ $input.event.raw }}'
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'code-1' },
      { source: 'code-1', target: 'agent-1' },
      { source: 'agent-1', target: 'code-2' },
      { source: 'code-2', target: 'if-1' },
      { source: 'if-1', sourceHandle: 'true', target: 'chat-1' },
      { source: 'if-1', sourceHandle: 'true', target: 'email-1' }
    ]
  },

  'advanced-ldap-audit': {
    name: '👥 LDAP User Audit',
    description: 'Scheduled sync pulls all LDAP users, compares against the database, flags new and removed accounts, and sends a report. Requires LDAP and database credentials.',
    category: 'Advanced',
    tags: ['ldap', 'audit', 'users', 'database', 'scheduled', 'google-chat'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'scheduleTrigger',
        name: 'Daily Audit',
        position: { x: 100, y: 200 },
        parameters: { cronExpression: '0 6 * * *', timezone: 'Europe/Stockholm' }
      },
      {
        id: 'ldap-1',
        type: 'ldap',
        name: 'Fetch LDAP Users',
        position: { x: 360, y: 100 },
        parameters: {
          useCredential: true,
          credentialId: '',
          operation: 'search',
          baseDn: 'ou=users,dc=company,dc=com',
          filter: '(objectClass=person)',
          scope: 'sub',
          attributes: ['cn', 'mail', 'department', 'memberOf']
        }
      },
      {
        id: 'sql-1',
        type: 'sqlDatabase',
        name: 'Fetch DB Users',
        position: { x: 360, y: 320 },
        parameters: {
          useCredential: true,
          credentialId: '',
          dbType: 'postgresql',
          operation: 'query',
          query: 'SELECT email, name, department FROM users WHERE active = true ORDER BY email'
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Compare & Diff',
        position: { x: 680, y: 200 },
        parameters: {
          code: `const all = items.map(i => i.json || {});
const ldapData = all.find(d => d.entries || d.results) || {};
const dbData = all.find(d => Array.isArray(d.rows) || (d.id && d.email)) || {};

const ldapEntries = ldapData.entries || ldapData.results || [];
const dbRows = dbData.rows || (Array.isArray(dbData) ? dbData : []);

const ldapEmails = new Set(ldapEntries.map(e => (e.attributes?.mail?.[0] || '').toLowerCase()).filter(Boolean));
const dbEmails = new Set(dbRows.map(r => (r.email || '').toLowerCase()).filter(Boolean));

const newInLdap = [...ldapEmails].filter(e => !dbEmails.has(e));
const removedFromLdap = [...dbEmails].filter(e => !ldapEmails.has(e));

return [{ json: {
  ldapCount: ldapEmails.size,
  dbCount: dbEmails.size,
  newAccounts: newInLdap,
  removedAccounts: removedFromLdap,
  hasChanges: newInLdap.length > 0 || removedFromLdap.length > 0,
  auditedAt: new Date().toISOString()
} }];`
        }
      },
      {
        id: 'chat-1',
        type: 'googleChat',
        name: 'Post Audit Report',
        position: { x: 980, y: 200 },
        parameters: {
          webhookUrl: '',
          messageType: 'card',
          cardTitle: '👥 LDAP Audit Report',
          cardSubtitle: '{{ $input.auditedAt }}',
          cardText: 'LDAP Users: {{ $input.ldapCount }} | DB Users: {{ $input.dbCount }}\n\n✅ New accounts: {{ $input.newAccounts }}\n⚠️ Removed accounts: {{ $input.removedAccounts }}',
          useTemplate: true
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'ldap-1' },
      { source: 'trigger-1', target: 'sql-1' },
      { source: 'ldap-1', target: 'code-1' },
      { source: 'sql-1', target: 'code-1' },
      { source: 'code-1', target: 'chat-1' }
    ]
  },

  'advanced-github-pr-summary': {
    name: '🐙 GitHub PR → AI Summary → Google Chat',
    description: 'Receive a GitHub pull_request webhook, AI summarizes the changes, and posts a review summary to Google Chat. Requires an AI credential and webhook.',
    category: 'Advanced',
    tags: ['github', 'ai', 'webhook', 'google-chat', 'devops'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'webhook',
        name: 'GitHub Webhook',
        position: { x: 100, y: 200 },
        parameters: {
          httpMethod: 'POST',
          path: 'github-pr',
          responseMode: 'onReceived',
          responseCode: 200,
          responseData: '{"ok":true}'
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Extract PR Data',
        position: { x: 370, y: 200 },
        parameters: {
          code: `const body = items[0]?.json?.body || items[0]?.json || {};
const action = body.action || '';
const pr = body.pull_request || {};
if (!pr.number) return [{ json: { skip: true, reason: 'Not a PR event' } }];
if (!['opened','synchronize','reopened'].includes(action)) return [{ json: { skip: true, reason: 'Ignored action: ' + action } }];

return [{ json: {
  skip: false,
  number: pr.number,
  title: pr.title || '',
  author: pr.user?.login || 'unknown',
  base: pr.base?.ref || 'main',
  head: pr.head?.ref || '',
  additions: pr.additions || 0,
  deletions: pr.deletions || 0,
  changed_files: pr.changed_files || 0,
  body: (pr.body || 'No description').substring(0, 800),
  url: pr.html_url || '',
  repo: body.repository?.full_name || '',
  message: 'Summarize this GitHub PR for a developer team:\\nTitle: ' + pr.title + '\\nBranch: ' + (pr.head?.ref||'') + ' → ' + (pr.base?.ref||'main') + '\\nChanged files: ' + (pr.changed_files||0) + ' (+' + (pr.additions||0) + '/-' + (pr.deletions||0) + ')\\nDescription: ' + (pr.body||'none').substring(0,600)
} }];`
        }
      },
      {
        id: 'if-1',
        type: 'if',
        name: 'Skip?',
        position: { x: 640, y: 200 },
        parameters: {
          mode: 'simple',
          field: 'skip',
          operator: 'eq',
          value: 'false'
        }
      },
      {
        id: 'agent-1',
        type: 'aiAgent',
        name: 'Summarize PR',
        position: { x: 900, y: 100 },
        parameters: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          useCredential: true,
          credentialId: '',
          temperature: 0.3,
          maxTokens: 400,
          systemPrompt: 'You are a senior code reviewer. Write a concise PR summary for a team chat. Format: 🎯 Purpose: [what this PR does]\n📦 Changes: [key changes]\n⚠️ Review focus: [what reviewers should look at]\nKeep it under 150 words.',
          enableMemory: false,
          enableTools: false,
          maxIterations: 3
        }
      },
      {
        id: 'chat-1',
        type: 'googleChat',
        name: 'Post to Google Chat',
        position: { x: 1160, y: 100 },
        parameters: {
          webhookUrl: '',
          messageType: 'card',
          cardTitle: '🔀 PR #{{ $input.number }}: {{ $input.title }}',
          cardSubtitle: '{{ $input.repo }} | {{ $input.author }} | +{{ $input.additions }}/-{{ $input.deletions }} in {{ $input.changed_files }} files',
          cardText: '{{ $input.output }}\n\n🔗 {{ $input.url }}',
          useTemplate: true
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'code-1' },
      { source: 'code-1', target: 'if-1' },
      { source: 'if-1', sourceHandle: 'true', target: 'agent-1' },
      { source: 'agent-1', target: 'chat-1' }
    ]
  },

  'advanced-form-submission-handler': {
    name: '📝 Form Submission Handler',
    description: 'Webhook receives a form submission, validates and transforms the data, saves to database, and sends a confirmation email to the submitter. Requires database and SMTP credentials.',
    category: 'Advanced',
    tags: ['webhook', 'form', 'database', 'email', 'validation'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'webhook',
        name: 'Receive Form',
        position: { x: 100, y: 200 },
        parameters: {
          httpMethod: 'POST',
          path: 'form-submit',
          responseMode: 'responseNode',
          responseCode: 200
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Validate & Transform',
        position: { x: 380, y: 200 },
        parameters: {
          code: `const body = items[0]?.json?.body || items[0]?.json || {};
const name = (body.name || '').trim();
const email = (body.email || '').trim().toLowerCase();
const message = (body.message || '').trim();

if (!name) throw new Error('name is required');
if (!email || !email.includes('@')) throw new Error('valid email is required');
if (!message) throw new Error('message is required');

return [{ json: {
  name,
  email,
  message: message.substring(0, 2000),
  submitted_at: new Date().toISOString(),
  ip: items[0]?.json?.headers?.['x-forwarded-for'] || 'unknown'
} }];`
        }
      },
      {
        id: 'sql-1',
        type: 'sqlDatabase',
        name: 'Save to DB',
        position: { x: 660, y: 200 },
        parameters: {
          useCredential: true,
          credentialId: '',
          dbType: 'postgresql',
          operation: 'query',
          query: "INSERT INTO form_submissions (name, email, message, submitted_at, ip) VALUES ('{{ $json.name }}', '{{ $json.email }}', '{{ $json.message }}', '{{ $json.submitted_at }}', '{{ $json.ip }}') RETURNING id"
        }
      },
      {
        id: 'email-1',
        type: 'sendEmail',
        name: 'Confirmation Email',
        position: { x: 940, y: 200 },
        parameters: {
          useCredential: true,
          credentialId: '',
          to: '{{ $input.email }}',
          subject: 'We received your message, {{ $input.name }}!',
          body: 'Hi {{ $input.name }},\n\nThank you for reaching out. We have received your message and will get back to you shortly.\n\nYour message:\n{{ $input.message }}\n\nSubmitted: {{ $input.submitted_at }}\n\nBest regards,\nThe Team'
        }
      },
      {
        id: 'response-1',
        type: 'webhookResponse',
        name: 'HTTP Response',
        position: { x: 1200, y: 200 },
        parameters: {
          statusCode: 200,
          contentType: 'application/json',
          responseMode: 'json',
          jsonData: { success: true, message: 'Form received. Check your email for confirmation.' }
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'code-1' },
      { source: 'code-1', target: 'sql-1' },
      { source: 'sql-1', target: 'email-1' },
      { source: 'email-1', target: 'response-1' }
    ]
  },

  'send-image-to-google-chat': {
    name: '🖼️ Send Image & Message → Google Chat',
    description: 'Post a local image and custom message to a Google Chat space. Trigger via the included HTML form — browse for an image, type your message, and click Send.',
    category: 'Integration',
    tags: ['google-chat', 'image', 'notification', 'form', 'webhook'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'webhook',
        name: 'Receive Form Submission',
        position: { x: 100, y: 200 },
        parameters: {
          httpMethod: 'POST',
          path: 'send-image-to-chat',
          responseMode: 'onReceived',
          responseCode: 200,
          responseData: '{"ok":true}'
        }
      },
      {
        id: 'code-1',
        type: 'code',
        name: 'Extract Fields',
        position: { x: 380, y: 200 },
        parameters: {
          code: `const body = items[0]?.json?.body || {};
const message = body.message || 'No message provided';
const imageUrl = body.imageUrl || '';
if (!imageUrl) throw new Error('imageUrl is required');
return [{ json: { message, imageUrl } }];`
        }
      },
      {
        id: 'chat-1',
        type: 'googleChat',
        name: 'Post to Google Chat',
        position: { x: 660, y: 200 },
        parameters: {
          credentialId: '',
          webhookUrl: '',
          messageType: 'card',
          cardTitle: '📸 New Image',
          cardSubtitle: '',
          cardText: '{{ $input.message }}',
          cardImageUrl: '{{ $input.imageUrl }}',
          cardImageAspectRatio: 1.3333,
          useTemplate: true
        }
      }
    ],
    connections: [
      { source: 'trigger-1', target: 'code-1' },
      { source: 'code-1', target: 'chat-1' }
    ]
  }
};
