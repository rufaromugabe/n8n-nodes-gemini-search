import {
  IExecuteFunctions,
  IHookFunctions,
  ILoadOptionsFunctions,
  IWebhookFunctions,
} from 'n8n-core';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { OptionsWithUri } from 'request-promise-native';

export async function geminiRequest(
  this:
    | IExecuteFunctions
    | IHookFunctions
    | ILoadOptionsFunctions
    | IWebhookFunctions,
  model: string,
  body: object,
) {
  const credentials = await this.getCredentials('geminiSearchApi');

  if (!credentials) {
    throw new NodeOperationError(this.getNode(), 'No credentials provided!');
  }

  const apiKey = credentials.apiKey;

  const options: OptionsWithUri = {
    method: 'POST',
    uri: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    qs: {
      key: apiKey,
    },
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    json: true,
  };

  try {
    if (!this.helpers) {
      throw new NodeOperationError(
        this.getNode(),
        'Helpers are not available!',
      );
    }
    // Replace non-null assertion with conditional check
    const response = await this.helpers.request?.(options);
    if (!response) {
      throw new NodeOperationError(
        this.getNode(),
        'No response from API request',
      );
    }
    return response;
  } catch (error) {
    throw new NodeApiError(this.getNode(), error);
  }
}

export async function getModels(
  this:
    | IExecuteFunctions
    | IHookFunctions
    | ILoadOptionsFunctions
    | IWebhookFunctions,
): Promise<string[]> {
  const credentials = await this.getCredentials('geminiSearchApi');

  if (!credentials) {
    throw new NodeOperationError(this.getNode(), 'No credentials provided!');
  }

  const apiKey = credentials.apiKey;

  const options: OptionsWithUri = {
    method: 'GET',
    uri: 'https://generativelanguage.googleapis.com/v1beta/models',
    qs: {
      key: apiKey,
    },
    json: true,
  };

  try {
    if (!this.helpers) {
      throw new NodeOperationError(
        this.getNode(),
        'Helpers are not available!',
      );
    }
    const response = await this.helpers.request?.(options);
    if (!response || !response.models) {
      throw new NodeOperationError(
        this.getNode(),
        'No response or models from API request',
      );
    }
    // Filter for models that support 'generateContent' and return their names
    return response.models
      .filter((model: any) =>
        model.supportedGenerationMethods?.includes('generateContent'),
      )
      .map((model: any) => model.name.replace('models/', ''));
  } catch (error) {
    throw new NodeApiError(this.getNode(), error);
  }
}
