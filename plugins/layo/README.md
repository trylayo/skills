# Layo

Layo makes short videos for brands, starring AI influencers you design.

An influencer is an invented person with a consistent look and voice that you reuse across videos. In Claude you can create an influencer from a description, choose their look and voice, and make a short video of them from a prompt, with an optional spoken line. You can also list the influencers and videos already in your Layo workspace.

Layo asks before it makes anything, and it makes invented people only: it won't copy a real person's likeness.

## Install

In Claude Code:

```text
/plugin marketplace add trylayo/skills
/plugin install layo@layo
```

Then run `/mcp` to sign in to Layo. The plugin adds the Layo skill and the Layo MCP server, `https://layo.co/mcp`.

Creating influencers and videos spends your workspace's credits. The skill tells Claude to show the price and wait for your yes before it creates anything.

## Links

- Docs: https://docs.layo.co
- Support: support@layo.co
- Privacy: https://layo.co/privacy-policy
- Terms: https://layo.co/terms-of-use-agreement

MIT. The Layo name and logo are Layo's trademarks and aren't covered by the license.
