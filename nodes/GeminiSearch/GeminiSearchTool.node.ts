import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';
import {
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { geminiRequest, getModels } from './GenericFunctions';
import axios from 'axios';
import { buildSystemInstruction } from './instructionBuilder';

export class GeminiSearchTool implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Gemini Search',
    name: 'geminiSearchTool',
    icon: 'file:gemini.svg',
    group: ['transform'],
    version: 1,
    description: 'Use Google Gemini as a search tool',
    defaults: {
      name: 'Gemini Search',
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
      {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        typeOptions: {
          loadOptionsMethod: 'getModels',
        },
        default: 'gemini-2.0-flash',
        description: 'The Gemini model to use',
      },
      {
        displayName: 'Enable URL Context Tool',
        name: 'enableUrlContext',
        type: 'boolean',
        default: true, // Default to true as per previous implementation for the tool
        description:
          'Allows the model to use URLs provided in the query as context. Ensure URLs are included in the Query field.',
      },
      {
        displayName: 'Organization Context',
        name: 'organization',
        type: 'string',
        default: '',
        description: 'Optional organization name to use as context for search',
      },
      {
        displayName: 'Restrict Search to URLs',
        name: 'restrictUrls',
        type: 'string',
        default: '',
        placeholder: 'example.com,docs.example.com',
        description:
          'Optional comma-separated list of URLs to restrict search to',
      },
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        options: [
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
            default: 2048,
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
            description:
              'Nucleus sampling parameter (0-1). Only included in request if set.',
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
            description: 'Top K sampling parameter. ',
          },
          {
            displayName: 'Custom System Instruction',
            name: 'systemInstruction',
            type: 'string',
            typeOptions: {
              rows: 4,
            },
            default: '',
            description: 'Override the default system instruction',
          },
          {
            displayName: 'Return Full Response',
            name: 'returnFullResponse',
            type: 'boolean',
            default: false,
            description: 'Whether to return the full API response',
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

    for (let i = 0; i < items.length; i++) {
      try {
        const query = this.getNodeParameter('query', i) as string;
        const model = this.getNodeParameter('model', i) as string;
        const organization = this.getNodeParameter(
          'organization',
          i,
          '',
        ) as string;
        const restrictUrls = this.getNodeParameter(
          'restrictUrls',
          i,
          '',
        ) as string;
        const options = this.getNodeParameter('options', i, {}) as {
          temperature?: number;
          maxOutputTokens?: number;
          topP?: number;
          topK?: number;
          systemInstruction?: string;
          returnFullResponse?: boolean;
          extractSourceUrl?: boolean;
        };

        const finalSystemInstruction = buildSystemInstruction({
          systemInstruction: options.systemInstruction,
          organization,
          restrictUrls,
        });

        const requestBody: any = {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: query,
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

        // Initialize tools array
        requestBody.tools = [];

        // For the GeminiSearchTool, googleSearch is a primary function.
        requestBody.tools.push({ googleSearch: {} });

        const enableUrlContext = this.getNodeParameter(
          'enableUrlContext',
          i,
          true, // Keep default as true for the tool
        ) as boolean;

        if (enableUrlContext) {
          requestBody.tools.push({ urlContext: {} });
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

        const response = await geminiRequest.call(this, model, requestBody);

        // Function to extract source URL from groundingMetadata
        const extractSourceUrl = (responseObj: any): string => {
          const possiblePaths = [
            responseObj?.candidates?.[0]?.groundingMetadata
              ?.groundingChunks?.[0]?.web?.uri,
          ];

          // Return the first valid URL
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
              (typeof response.request === 'object' && 'res' in response.request
                ? response.request.res.headers?.location
                : null) || // Check location header
              url; // Fallback to original URL

            return finalUrl;
          } catch (error) {
            // Return more error details for debugging
            console.error(`Error fetching redirected URL: ${error.message}`);
            return url;
          }
        };

        const outputData: {
          result: string;
          query: string;
          organization: string;
          restrictedUrls?: string;
          sourceUrl?: string;
          redirectedSourceUrl?: string;
          fullResponse?: any;
          urlContextMetadata?: any; // Added this line
        } = {
          result: response.candidates?.[0]?.content?.parts?.[0]?.text || '',
          query,
          organization,
          restrictedUrls: restrictUrls || undefined,
        };

        // Add url_context_metadata to the output if it exists
        if (response.candidates?.[0]?.url_context_metadata) {
          outputData.urlContextMetadata =
            response.candidates[0].url_context_metadata;
        }

        if (options.extractSourceUrl) {
          const sourceUrl = extractSourceUrl(response);
          outputData.sourceUrl = sourceUrl;

          // Get redirected URL if source URL exists
          if (sourceUrl) {
            try {
              outputData.redirectedSourceUrl = await getRedirectedUrl(
                sourceUrl,
              );
            } catch (error) {
              outputData.redirectedSourceUrl = sourceUrl;
            }
          }
        }

        if (options.returnFullResponse) {
          outputData.fullResponse = response;
        }

        returnData.push({
          json: outputData,
          pairedItem: { item: i },
        });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error.message,
            },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
