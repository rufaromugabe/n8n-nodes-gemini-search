import type {
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { sleep } from 'n8n-workflow';
import { geminiRequest, getModels } from './GenericFunctions';
import axios from 'axios';
import { mainProperties } from './Description';
import {
  buildSystemInstruction,
  buildUserQueryWithUrlContext,
} from './instructionBuilder';

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
    properties: mainProperties,
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

        const finalSystemInstruction = buildSystemInstruction({
          systemInstruction,
          organization,
        });

        // Build user query with URL context if urlContext tool is enabled for webSearch AND URLs are provided
        const enableUrlContext =
          operation === 'webSearch'
            ? (this.getNodeParameter('enableUrlContext', i, false) as boolean)
            : false;
        const hasUrls = restrictUrls && restrictUrls.trim() !== '';
        const shouldUseUrlContext = enableUrlContext && hasUrls;
        const finalPrompt = shouldUseUrlContext
          ? buildUserQueryWithUrlContext(prompt, restrictUrls)
          : prompt;

        const requestBody: any = {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: finalPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: options.maxOutputTokens || 2048,
            responseMimeType: 'text/plain',
          },
        };

        // Add temperature only if explicitly set (including 0)
        if (options.temperature !== undefined) {
          requestBody.generationConfig.temperature = options.temperature;
        } else {
          requestBody.generationConfig.temperature = 0.6; // Default value
        }

        // Only add topP and topK if they are explicitly set
        if (options.topP !== undefined) {
          requestBody.generationConfig.topP = options.topP;
        }
        if (options.topK !== undefined) {
          requestBody.generationConfig.topK = options.topK;
        }

        requestBody.tools = [];
        if (operation === 'webSearch') {
          requestBody.tools.push({ googleSearch: {} });
          if (shouldUseUrlContext) {
            requestBody.tools.push({ urlContext: {} });
          }
        }
        // Generate content does not use any tools

        // If no tools were added (e.g. generateContent without URL context), remove the empty tools array
        if (requestBody.tools.length === 0) {
          delete requestBody.tools;
        }

        if (finalSystemInstruction) {
          requestBody.systemInstruction = {
            parts: [
              {
                text: finalSystemInstruction,
              },
            ],
          };
        }

        const perItemPromise = (async () => {
          const response = await geminiRequest.call(this, model, requestBody);

          // Function to extract source URL from groundingMetadata
          const extractSourceUrl = (responseObj: any): string => {
            const possiblePaths = [
              responseObj?.candidates?.[0]?.groundingMetadata
                ?.groundingChunks?.[0]?.web?.uri,
            ];
            return (
              possiblePaths.find(
                (url) =>
                  typeof url === 'string' &&
                  (url.startsWith('http://') || url.startsWith('https://')),
              ) || ''
            );
          };

          // Function to get final redirected URL
          const getRedirectedUrl = async (url: string): Promise<string> => {
            if (!url) return '';
            try {
              const response = await axios.head(url, {
                maxRedirects: 10,
                timeout: 5000,
                validateStatus: null, // Don't throw on any status code
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
              });

              // Check for the final URL in multiple places
              const finalUrl =
                response.request?.res?.responseUrl || // Node.js response
                response.request?.responseURL || // Browser response
                (typeof response.request === 'object' &&
                'res' in response.request
                  ? response.request.res.headers?.location
                  : null) || // Check location header
                url; // Fallback to original URL

              return finalUrl;
            } catch (error: any) {
              console.error(`Error fetching redirected URL: ${error.message}`);
              return url;
            }
          };

          const outputJson: any = {
            response: response.candidates?.[0]?.content?.parts?.[0]?.text || '',
            fullResponse: response,
          };

          // Add url_context_metadata to the output if it exists
          if (response.candidates?.[0]?.url_context_metadata) {
            outputJson.urlContextMetadata =
              response.candidates[0].url_context_metadata;
          }

          if (operation === 'webSearch') {
            if (restrictUrls) {
              outputJson.restrictedUrls = restrictUrls;
            }
          }

          if (options.extractSourceUrl) {
            const sourceUrl = extractSourceUrl(response);
            outputJson.sourceUrl = sourceUrl;

            // Get redirected URL if source URL exists
            if (sourceUrl) {
              try {
                outputJson.redirectedSourceUrl = await getRedirectedUrl(
                  sourceUrl,
                );
              } catch (error: any) {
                outputJson.redirectedSourceUrl = sourceUrl;
                outputJson.redirectError = error.message;
              }
            }
          }

          return { outputJson };
        })();

        perItemPromise.catch(() => {});
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
