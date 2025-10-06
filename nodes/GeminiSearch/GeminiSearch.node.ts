import type {
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

import { getModels, sleep } from './GenericFunctions';
import { executeGeminiRequest } from './ExecutionUtils';
import {
  modelProperty,
  batchingOptions,
  commonModelOptions,
  extractSourceUrlOption,
  getUrlContextOptions,
  getOrganizationContextOptions,
  getSystemInstructionProperty,
} from './SharedProperties';

export class GeminiSearch implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Gemini Search',
    name: 'geminiSearch',
    icon: 'file:gemini.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description:
      'Perform searches and generate content using Google Gemini API',
    defaults: {
      name: 'Gemini Search',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'geminiSearchApi',
        required: true,
      },
    ],
    properties: [
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
      modelProperty,
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
      ...getUrlContextOptions(['webSearch']),
      ...getOrganizationContextOptions(['webSearch']),
      getSystemInstructionProperty(['webSearch', 'generateContent']),
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        options: [
          batchingOptions,
          ...commonModelOptions,
          extractSourceUrlOption,
        ],
      },
    ],
  };

  methods = {
    loadOptions: {
      async getModels(this: ILoadOptionsFunctions) {
        const models = await getModels.call(this);
        return models.map((model) => ({
          name: model,
          value: model,
        }));
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // Collect per-item promises for concurrent execution
    const requestPromises: Array<Promise<any>> = [];
    const errorItems: Record<number, string> = {};

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;
        const model = this.getNodeParameter('model', i) as string;
        const prompt = this.getNodeParameter('prompt', i) as string;
        const options = this.getNodeParameter('options', i, {}) as {
          temperature?: number;
          maxOutputTokens?: number;
          topP?: number;
          topK?: number;
          extractSourceUrl?: boolean;
          batching: { batch: { batchSize: number; batchInterval: number } };
        };

        // Batching throttle (mirrors HttpRequest.node.ts behavior)
        // Defaults batch size to 1 if set to 0, and -1 disables batching
        const batchSize =
          options?.batching?.batch?.batchSize &&
          options.batching.batch.batchSize > 0
            ? options.batching.batch.batchSize
            : 1;
        const batchInterval = options?.batching?.batch?.batchInterval ?? 0;

        if (i > 0 && batchSize >= 0 && batchInterval > 0) {
          if (i % batchSize === 0) {
            await sleep(batchInterval);
          }
        }

        const systemInstruction = this.getNodeParameter(
          'systemInstruction',
          i,
          '',
        ) as string;
        const enableOrganizationContext =
          operation === 'webSearch'
            ? (this.getNodeParameter(
                'enableOrganizationContext',
                i,
                false,
              ) as boolean)
            : false;
        const organization =
          operation === 'webSearch' && enableOrganizationContext
            ? (this.getNodeParameter('organization', i, '') as string)
            : '';
        const restrictUrls =
          operation === 'webSearch'
            ? (this.getNodeParameter('restrictUrls', i, '') as string)
            : '';

        // Build user query with URL context if urlContext tool is enabled for webSearch AND URLs are provided
        const enableUrlContext =
          operation === 'webSearch'
            ? (this.getNodeParameter('enableUrlContext', i, false) as boolean)
            : false;

        const perItemPromise = (async () => {
          const output = await executeGeminiRequest(
            this,
            {
              model,
              prompt,
              operation: operation as 'webSearch' | 'generateContent',
              systemInstruction,
              organization,
              restrictUrls,
              enableUrlContext,
              temperature: options.temperature,
              maxOutputTokens: options.maxOutputTokens,
              topP: options.topP,
              topK: options.topK,
            },
            {
              extractSourceUrl: options.extractSourceUrl,
              includeFullResponse: true,
              includeRestrictedUrls: true,
              restrictUrls,
              operation,
            },
          );

          // Map the output to the expected format for GeminiSearch node
          const outputJson: any = {
            response: output.response || '',
            fullResponse: output.fullResponse,
          };

          if (output.urlContextMetadata) {
            outputJson.urlContextMetadata = output.urlContextMetadata;
          }

          if (output.restrictedUrls) {
            outputJson.restrictedUrls = output.restrictedUrls;
          }

          if (output.sourceUrl) {
            outputJson.sourceUrl = output.sourceUrl;
          }

          if (output.redirectedSourceUrl) {
            outputJson.redirectedSourceUrl = output.redirectedSourceUrl;
          }

          if (output.redirectError) {
            outputJson.redirectError = output.redirectError;
          }

          return { outputJson };
        })();

        requestPromises.push(perItemPromise);
      } catch (error: any) {
        if (!this.continueOnFail()) throw error;
        errorItems[i] = error.message;
        // Push a resolved placeholder to preserve index alignment in settled results
        requestPromises.push(Promise.resolve(undefined));
        continue;
      }
    }

    const settled = await Promise.allSettled(requestPromises);

    for (let i = 0; i < items.length; i++) {
      const outcome = settled[i] as PromiseSettledResult<any>;
      if (errorItems[i]) {
        returnData.push({
          json: { error: errorItems[i] },
          pairedItem: { item: i },
        });
        continue;
      }

      if (outcome.status !== 'fulfilled') {
        if (this.continueOnFail()) {
          const reason: any = (outcome as any).reason;
          returnData.push({
            json: { error: reason?.message ?? reason },
            pairedItem: { item: i },
          });
          continue;
        }
        throw (outcome as any).reason;
      }

      returnData.push({
        json: outcome.value.outputJson,
        pairedItem: { item: i },
      });
    }

    return [returnData];
  }
}
