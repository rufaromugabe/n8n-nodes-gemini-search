import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';
import {
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { geminiRequest, getModels } from './GenericFunctions';
import axios from 'axios';
import { buildSystemInstruction } from './instructionBuilder';

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
        displayName: 'Organization Context',
        name: 'organization',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            operation: ['webSearch'],
          },
        },
        description: 'Optional organization name to use as context for search',
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
          },
        },
        description:
          'Optional comma-separated list of URLs to restrict search to',
      },
      {
        displayName: 'Enable URL Context Tool (for Generate Content)',
        name: 'enableUrlContextForGenContent',
        type: 'boolean',
        default: false,
        displayOptions: {
          show: {
            operation: ['generateContent'],
          },
        },
        description:
          'Allows the model to use URLs provided in the prompt as context. Ensure URLs are included in the Prompt field.',
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
            default: 1,
            description: 'Nucleus sampling parameter',
          },
          {
            displayName: 'Top K',
            name: 'topK',
            type: 'number',
            default: 1,
            description: 'Top K sampling parameter',
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
        const operation = this.getNodeParameter('operation', i) as string;
        const model = this.getNodeParameter('model', i) as string;
        const prompt = this.getNodeParameter('prompt', i) as string;
        const options = this.getNodeParameter('options', i, {}) as {
          temperature?: number;
          maxOutputTokens?: number;
          topP?: number;
          topK?: number;
          extractSourceUrl?: boolean;
        };

        const systemInstruction = this.getNodeParameter(
          'systemInstruction',
          i,
          '',
        ) as string;
        const organization =
          operation === 'webSearch'
            ? (this.getNodeParameter('organization', i, '') as string)
            : '';
        const restrictUrls =
          operation === 'webSearch'
            ? (this.getNodeParameter('restrictUrls', i, '') as string)
            : '';

        const finalSystemInstruction = buildSystemInstruction({
          systemInstruction,
          organization,
          restrictUrls,
        });

        const requestBody: any = {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: options.temperature || 0.6,
            topP: options.topP || 1,
            topK: options.topK || 1,
            maxOutputTokens: options.maxOutputTokens || 2048,
            responseMimeType: 'text/plain',
          },
        };

        requestBody.tools = []; // Initialize tools array

        if (operation === 'webSearch') {
          requestBody.tools.push({ googleSearch: {} });
          // As per docs, URL context can be used with Google Search
          requestBody.tools.push({ urlContext: {} });
        } else if (operation === 'generateContent') {
          const enableUrlContextForGenContent = this.getNodeParameter(
            'enableUrlContextForGenContent',
            i,
            false,
          ) as boolean;
          if (enableUrlContextForGenContent) {
            requestBody.tools.push({ urlContext: {} });
          }
        }

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
          const restrictUrls = this.getNodeParameter(
            'restrictUrls',
            i,
            '',
          ) as string;
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
            } catch (error) {
              outputJson.redirectedSourceUrl = sourceUrl;
              outputJson.redirectError = error.message;
            }
          }
        }

        returnData.push({
          json: outputJson,
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
