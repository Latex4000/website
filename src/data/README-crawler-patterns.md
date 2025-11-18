# Additional Crawler Patterns

This file contains supplementary bot and crawler patterns that complement the external crawler list from [monperrus/crawler-user-agents](https://github.com/monperrus/crawler-user-agents).

## Purpose

The external crawler list is comprehensive but may not always include the latest AI crawlers and common scraping tools. This file provides:

1. **Latest AI Crawlers**: Patterns for new AI bots like Claude-Web, Anthropic-AI, Google-Extended, cohere-ai
2. **Common Scraping Tools**: Detection for python-requests, curl, wget, axios, Go-http-client, Scrapy
3. **Other Bots**: Additional crawlers like Amazonbot, Diffbot, ImagesiftBot, YouBot, etc.

## Pattern Format

Each pattern follows the same format as the external list:

```json
{
  "pattern": "regex-pattern",
  "url": "documentation-url",
  "instances": ["example user agent strings"]
}
```

The patterns are loaded with case-insensitive matching (the `i` flag).

## Updating

When adding new patterns:

1. Add the pattern object to the JSON array
2. Include a regex pattern that matches the bot's user agent
3. Provide a URL for documentation (optional but recommended)
4. Include example user agent strings in the instances array
5. Test the pattern to ensure it doesn't block legitimate browsers

## Testing

Run the test suite to verify patterns work correctly:

```bash
node /tmp/test-bot-detection.mjs
```

## References

- [AI Bot User Agents Guide](https://llmscentral.com/blog/ai-bot-user-agents-complete-guide)
- [AI Crawler Cheat Sheet 2025](https://www.tryaivo.com/blog/ai-crawler-cheat-sheet-2025-which-bots-should-you-allow)
- [List of Top AI Search Crawlers](https://momenticmarketing.com/blog/ai-search-crawlers-bots)
