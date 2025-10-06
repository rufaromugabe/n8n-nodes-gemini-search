import type { INodeProperties } from 'n8n-workflow';

/**
 * Common model selection property
 */
export const modelProperty: INodeProperties = {
  displayName: 'Model',
  name: 'model',
  type: 'options',
  typeOptions: {
    loadOptionsMethod: 'getModels',
  },
  default: 'gemini-2.5-flash',
  description: 'The Gemini model to use',
};

/**
 * Common batching options shared between nodes
 */
export const batchingOptions: INodeProperties = {
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
};

/**
 * Common model configuration options
 */
export const commonModelOptions: INodeProperties[] = [
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
];

/**
 * Common URL context options (without displayOptions for operation)
 * Can be used directly in GeminiSearchTool or with getUrlContextOptions helper for operation-specific display
 */
export const urlContextOptions: INodeProperties[] = [
  {
    displayName: 'Enable URL Context Tool',
    name: 'enableUrlContext',
    type: 'boolean',
    default: false,
    description:
      'When enabled, allows the model to use specific URLs as context. When disabled, uses general Gemini search.',
  },
  {
    displayName: 'Restrict Search to URLs',
    name: 'restrictUrls',
    type: 'string',
    default: '',
    placeholder: 'example.com,docs.example.com',
    description:
      'Comma-separated list of URLs to restrict search to. Only used when URL Context is enabled.',
    displayOptions: {
      show: {
        enableUrlContext: [true],
      },
    },
  },
];

/**
 * Helper to get URL context options with operation-specific displayOptions
 */
export const getUrlContextOptions = (operation: string[]): INodeProperties[] => [
  {
    displayName: 'Enable URL Context Tool',
    name: 'enableUrlContext',
    type: 'boolean',
    default: false,
    displayOptions: {
      show: {
        operation,
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
        operation,
        enableUrlContext: [true],
      },
    },
    description:
      'Comma-separated list of URLs to restrict search to. Only used when URL Context is enabled.',
  },
];


export const organizationContextOptions: INodeProperties[] = [
  {
    displayName: 'Enable Organization Context',
    name: 'enableOrganizationContext',
    type: 'boolean',
    default: false,
    description:
      'When enabled, restricts search to a specific organization domain.',
  },
  {
    displayName: 'Organization Context',
    name: 'organization',
    type: 'string',
    default: '',
    description:
      'Organization name to use as context for search. Only used when Organization Context is enabled.',
    displayOptions: {
      show: {
        enableOrganizationContext: [true],
      },
    },
  },
];

/**
 * Helper to get organization context options with operation-specific displayOptions
 */
export const getOrganizationContextOptions = (operation: string[]): INodeProperties[] => [
  {
    displayName: 'Enable Organization Context',
    name: 'enableOrganizationContext',
    type: 'boolean',
    default: false,
    displayOptions: {
      show: {
        operation,
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
        operation,
        enableOrganizationContext: [true],
      },
    },
    description:
      'Organization name to use as context for search. Only used when Organization Context is enabled.',
  },
];

/**
 * Common system instruction property for top-level use
 * Helper to get system instruction with operation-specific displayOptions
 */
export const getSystemInstructionProperty = (operation: string[]): INodeProperties => ({
  displayName: 'System Instruction',
  name: 'systemInstruction',
  type: 'string',
  typeOptions: {
    rows: 4,
  },
  default: '',
  displayOptions: {
    show: {
      operation,
    },
  },
  description: 'Optional system instruction to guide the model behavior',
});

/**
 * Common system instruction option for use inside Options collection
 */
export const systemInstructionOption: INodeProperties = {
  displayName: 'Custom System Instruction',
  name: 'systemInstruction',
  type: 'string',
  typeOptions: {
    rows: 4,
  },
  default: '',
  description: 'Override the default system instruction',
};

/**
 * Common return full response option
 */
export const returnFullResponseOption: INodeProperties = {
  displayName: 'Return Full Response',
  name: 'returnFullResponse',
  type: 'boolean',
  default: false,
  description: 'Whether to return the full API response',
};

/**
 * Common extract source URL option
 */
export const extractSourceUrlOption: INodeProperties = {
  displayName: 'Extract Source URL',
  name: 'extractSourceUrl',
  type: 'boolean',
  default: false,
  description: 'Whether to extract the source URL from the response',
};
