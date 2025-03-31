# n8n-nodes-gemini-search

This is an n8n community node package that provides nodes to interact with Google's Gemini AI models for search and content generation capabilities.

## Features

- **Gemini Search Node**: A comprehensive node that can perform web searches and generate content using Google's Gemini models
- **Gemini Search Tool**: A simplified tool version optimized for quick searches with Google Gemini

## Installation

### In n8n Desktop

1. Go to Settings > Community Nodes
2. Select "Install"
3. Enter `n8n-nodes-gemini-search` in the "npm package name" field
4. Click "Install"

### In n8n Cloud

Use the Community Nodes feature to add this node to your cloud instance.

## Usage

### Gemini Search Node

This node offers two operations:

1. **Web Search**: Performs a web search using Gemini's capabilities
2. **Generate Content**: Generates content using Gemini without web search

You'll need to provide:
- Google Gemini API key
- Prompt/query
- Optional organization context (for search)
- Model selection

### Gemini Search Tool

This is a simplified version focused on search:
- Enter your search query
- Optional organization context to limit search scope
- Customize parameters like temperature and token limits

## Credentials

This node requires a Google Gemini API key. You can get one from the [Google AI Studio](https://ai.google.dev/).

## Support

For issues or feature requests, please [open an issue](https://github.com/yourusername/n8n-nodes-gemini-search/issues) on GitHub.
