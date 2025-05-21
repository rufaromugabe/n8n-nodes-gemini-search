# n8n-nodes-gemini-search

This is an n8n community node package that provides nodes to interact with Google's Gemini AI models for search and content generation capabilities.

![Gemini Search Nodes](https://img.shields.io/badge/n8n-community-brightgreen) ![Version](https://img.shields.io/badge/version-1.0.24-blue)

## Features

- **Gemini Search Node**: A comprehensive node that can perform web searches and generate content using Google's Gemini models
- **Gemini Search Tool**: A simplified tool version optimized for quick searches with Google Gemini
- **URL Restriction**: Limit searches to specific websites or domains
- **Organization Context**: Provide company or domain-specific context for more relevant results
- **Multiple Model Support**: Choose from various Gemini models including latest versions (1.0 Pro, 1.5 Pro, 2.0 Flash, 2.0 Pro, 2.5 Pro)

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

#### Configuration Options:

- **API Key**: Google Gemini API key (required)
- **Model**: Select from available Gemini models
- **Prompt/Query**: Your search query or content generation prompt
- **Organization Context**: Optional context to focus the search on a specific organization
- **URL Restrictions**: Limit search to specific websites (comma-separated)
- **System Instruction**: Custom instructions to guide the AI behavior
- **Advanced Options**:
  - Temperature: Control response randomness (0.0-1.0)
  - Max Output Tokens: Limit response length
  - Top P/Top K: Fine-tune token selection
  - Extract Source URL: Retrieve source URLs for search results

### Gemini Search Tool

This is a simplified version focused on search, optimized for use as an n8n tool:

- **Query**: Enter your search query
- **Model**: Select from available Gemini models
- **Organization Context**: Optional context to focus on specific organizations
- **URL Restrictions**: Limit search to specific websites
- **Options**:
  - Temperature: Control response randomness
  - Max Output Tokens: Limit response length
  - Custom System Instruction: Override default instructions
  - Return Full Response: Include complete API response data
  - Extract Source URL: Retrieve source URLs

## Example Workflows

### Basic Search

1. Create a new workflow
2. Add a "Gemini Search Tool" node
3. Configure your API credentials
4. Enter a search query
5. Execute and view the search results

### Advanced Content Generation

1. Create a new workflow
2. Add a "Gemini Search" node
3. Set operation to "Generate Content"
4. Configure model and prompt
5. Adjust temperature and token settings as needed
6. Execute to generate AI content

## Using as a Tool

This node can be used as a tool in n8n AI Agents. To enable community nodes as tools, you need to set the `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE` environment variable to `true`.

### Setting the Environment Variable

#### Bash/Zsh Shell

```bash
export N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
n8n start
```

#### Docker (docker-compose.yml)

```yaml
environment:
  - N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
```

#### Desktop App

Create a `.env` file in the n8n directory:

```
N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
```

#### Permanent Setting (Mac/Linux)

Add to your `~/.zshrc` or `~/.bash_profile`:

```bash
export N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
```

## Credentials

This node requires a Google Gemini API key. You can get one from the [Google AI Studio](https://ai.google.dev/).

## Support

For issues or feature requests, please [open an issue](https://github.com/rufaromugabe/n8n-nodes-gemini-search/issues) on GitHub.

## License

[MIT](LICENSE)

## v1.1.10 

This version introduces dynamic model loading and the new Gemini URL Context tool.

**Key Updates:**

- **Dynamic Model Loading:** Models are now fetched directly from the Gemini API, ensuring the list is always up-to-date.
- **URL Context Tool:** Leverages Gemini's new capability to analyze content from URLs provided in the prompt. This is available in the "Generate Content" operation of the `Gemini Search` node and is enabled by default in the `Gemini Search Tool` node.
- **Fixes & Improvements:** Includes fixes for linting issues and general code refinements.
