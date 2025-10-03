import type { INodeProperties } from 'n8n-workflow';

export const mainProperties: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    options: [
      {
        name: 'Web Search',
        value: 'webSearch',
        description: 'Perform a web search using Gemini',
        action: 'Perform a web search using Gemini',
      },
      {
        name: 'Generate Content',
        value: 'generateContent',
        description: 'Generate content using Gemini',
        action: 'Generate content using Gemini',
      },
    ],
    default: 'webSearch',
  },
  {
    displayName: 'Model',
    name: 'model',
    type: 'options',
    typeOptions: {
      loadOptionsMethod: 'getModels',
    },
    default: 'gemini-2.5-flash',
    description: 'The Gemini model to use',
  },
  {
    displayName: 'Prompt',
    name: 'prompt',
    type: 'string',
    default: '',
    required: true,
    displayOptions: {
      show: {
        operation: ['webSearch', 'generateContent'],
      },
    },
    description: 'The prompt to send to Gemini',
  },
  {
    displayName: 'Enable URL Context Tool',
    name: 'enableUrlContext',
    type: 'boolean',
    default: false,
    displayOptions: {
      show: {
        operation: ['webSearch'],
      },
    },
    description:
      'When enabled, allows the model to use specific URLs as context. When disabled, uses general Gemini search.',
  },
  {
    displayName: 'Restrict Search to URLs',
    name: 'restrictUrls',
    type: 'string',
    default: '',
    placeholder: 'example.com,docs.example.com',
    displayOptions: {
      show: {
        operation: ['webSearch'],
        enableUrlContext: [true],
      },
    },
    description:
      'Comma-separated list of URLs to restrict search to. Only used when URL Context is enabled.',
  },
  {
    displayName: 'Enable Organization Context',
    name: 'enableOrganizationContext',
    type: 'boolean',
    default: false,
    displayOptions: {
      show: {
        operation: ['webSearch'],
      },
    },
    description:
      'When enabled, restricts search to a specific organization domain.',
  },
  {
    displayName: 'Organization Context',
    name: 'organization',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        operation: ['webSearch'],
        enableOrganizationContext: [true],
      },
    },
    description:
      'Organization name to use as context for search. Only used when Organization Context is enabled.',
  },
  {
    displayName: 'System Instruction',
    name: 'systemInstruction',
    type: 'string',
    typeOptions: {
      rows: 4,
    },
    default: '',
    displayOptions: {
      show: {
        operation: ['webSearch', 'generateContent'],
      },
    },
    description: 'Optional system instruction to guide the model behavior',
  },
  {
    displayName: 'Options',
    name: 'options',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    options: [
      {
        displayName: 'Batching',
        name: 'batching',
        placeholder: 'Add Batching',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: false,
        },
        default: {
          batch: {},
        },
        options: [
          {
            displayName: 'Batching',
            name: 'batch',
            values: [
              {
                displayName: 'Items per Batch',
                name: 'batchSize',
                type: 'number',
                typeOptions: {
                  minValue: -1,
                },
                default: 15,
                description:
                  'Input will be split in batches to throttle requests. -1 for disabled. 0 will be treated as 1.',
              },
              {
                // eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
                displayName: 'Batch Interval (ms)',
                name: 'batchInterval',
                type: 'number',
                typeOptions: {
                  minValue: 0,
                },
                default: 1000,
                description:
                  'Time (in milliseconds) between each batch of requests. 0 for disabled.',
              },
            ],
          },
        ],
      },
      {
        displayName: 'Temperature',
        name: 'temperature',
        type: 'number',
        typeOptions: {
          minValue: 0,
          maxValue: 1,
          numberPrecision: 1,
        },
        default: 0.6,
        description: 'Controls randomness in the response (0-1)',
      },
      {
        displayName: 'Max Output Tokens',
        name: 'maxOutputTokens',
        type: 'number',
        default: 8192,
        description: 'Maximum number of tokens to generate',
      },
      {
        displayName: 'Top P',
        name: 'topP',
        type: 'number',
        typeOptions: {
          minValue: 0,
          maxValue: 1,
          numberPrecision: 2,
        },
        default: 1,
        description: 'Nucleus sampling parameter (0-1)..',
      },
      {
        displayName: 'Top K',
        name: 'topK',
        type: 'number',
        typeOptions: {
          minValue: 1,
          maxValue: 40,
        },
        default: 1,
        description:
          'Top K sampling parameter. Only included in request if set.',
      },
      {
        displayName: 'Extract Source URL',
        name: 'extractSourceUrl',
        type: 'boolean',
        default: false,
        description: 'Whether to extract the source URL from the response',
      },
    ],
  },
];
