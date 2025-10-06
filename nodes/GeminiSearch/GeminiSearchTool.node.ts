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
  urlContextOptions,
  organizationContextOptions,
  systemInstructionOption,
  returnFullResponseOption,
  extractSourceUrlOption,
} from './SharedProperties';

export class GeminiSearchTool implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Gemini Search Tool',
    name: 'geminiSearchTool',
    icon: 'file:gemini.svg',
    group: ['transform'],
    version: 1,
    description: 'Use Google Gemini as a search tool',
    defaults: {
      name: 'Gemini Search Tool',
    },
    // @ts-expect-error - node-class-description-outputs-wrong - intentionally suppressing type error
    inputs: [{ type: 'main', required: true }],
    // @ts-expect-error - node-class-description-outputs-wrong - intentionally suppressing type error
    outputs: [{ type: 'main', required: true }],
    usableAsTool: true,
    credentials: [
      {
        name: 'geminiSearchApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Query',
        name: 'query',
        type: 'string',
        default: '',
        required: true,
        description: 'The search query to execute with Gemini',
      },
      modelProperty,
      ...urlContextOptions,
      ...organizationContextOptions,
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        options: [
          batchingOptions,
          ...commonModelOptions,
          systemInstructionOption,
          returnFullResponseOption,
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
        const query = this.getNodeParameter('query', i) as string;
        const model = this.getNodeParameter('model', i) as string;
        const options = this.getNodeParameter('options', i, {}) as {
          temperature?: number;
          maxOutputTokens?: number;
          topP?: number;
          topK?: number;
          systemInstruction?: string;
          returnFullResponse?: boolean;
          extractSourceUrl?: boolean;
          batching: { batch: { batchSize: number; batchInterval: number } };
        };

        // Batching throttle (mirrors HttpRequest.node.ts behavior)
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

        const enableUrlContext = this.getNodeParameter(
          'enableUrlContext',
          i,
          false,
        ) as boolean;
        const restrictUrls = this.getNodeParameter(
          'restrictUrls',
          i,
          '',
        ) as string;
        const enableOrganizationContext = this.getNodeParameter(
          'enableOrganizationContext',
          i,
          false,
        ) as boolean;
        const organization = enableOrganizationContext
          ? (this.getNodeParameter('organization', i, '') as string)
          : '';

        const perItemPromise = (async () => {
          const output = await executeGeminiRequest(
            this,
            {
              model,
              prompt: query,
              operation: 'webSearch',
              systemInstruction: options.systemInstruction,
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
              includeFullResponse: options.returnFullResponse,
              includeRestrictedUrls: true,
              restrictUrls,
              operation: 'webSearch',
            },
          );

          // Format output for tool node (use 'result' instead of 'response')
          const outputData: any = {
            result: output.response || '',
            query,
            organization,
          };

          if (restrictUrls) {
            outputData.restrictedUrls = restrictUrls;
          }

          if (output.urlContextMetadata) {
            outputData.urlContextMetadata = output.urlContextMetadata;
          }

          if (output.sourceUrl) {
            outputData.sourceUrl = output.sourceUrl;
          }

          if (output.redirectedSourceUrl) {
            outputData.redirectedSourceUrl = output.redirectedSourceUrl;
          }

          if (options.returnFullResponse && output.fullResponse) {
            outputData.fullResponse = output.fullResponse;
          }

          return { outputData };
        })();

        requestPromises.push(perItemPromise);
      } catch (error: any) {
        if (!this.continueOnFail()) throw error;
        errorItems[i] = error.message;
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
        json: outcome.value.outputData,
        pairedItem: { item: i },
      });
    }

    return [returnData];
  }
}
