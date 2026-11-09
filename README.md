# Layo skills

Agent skills and plugins for [Layo](https://layo.co), where you design an AI influencer once and star them in short
videos.

The `layo` skill teaches coding agents to use Layo well: connect through the Layo MCP server or the REST API, check
prices before spending credits, create influencers and videos, follow each one until it's finished, retry safely, and
handle errors. It points to [docs.layo.co](https://docs.layo.co) for detail, so it stays current as Layo changes.

The plugin also adds the Layo MCP server, `https://layo.co/mcp`. You sign in to Layo the first time a tool is used.

> Creating influencers and videos spends your workspace's credits. The skill tells the agent to show you the price and
> wait for your yes, but Layo itself doesn't ask again: an agent with access can spend your balance.

## Install

### Claude Code

```text
/plugin marketplace add trylayo/skills
/plugin install layo@layo
```

Then run `/mcp` to sign in to Layo.

### Codex

```bash
codex plugin marketplace add trylayo/skills
codex plugin add layo@layo
```

Or install only the skill: in Codex, ask `$skill-installer install https://github.com/trylayo/skills/tree/main/plugins/layo/skills/layo`.

### Cursor, and other agents that read SKILL.md

```bash
npx skills add trylayo/skills
```

Pick your agent when asked, or pass it, for example `npx skills add trylayo/skills -a cursor`. To add the Layo MCP
server to an agent by hand, see [Connect your assistant](https://docs.layo.co/connect).

### By hand

Copy [`plugins/layo/skills/layo`](plugins/layo/skills/layo) into your agent's skills folder, such as `.claude/skills/`,
`.agents/skills/` or `.cursor/skills/`.

## Use an API key instead of signing in

Make a key at [layo.co/api-keys](https://layo.co/api-keys) and set it in your shell or your agent's environment:

```bash
export LAYO_API_KEY=...   # never paste it into a chat
```

The skill then calls the REST API at `https://layo.co/v1`. A key with the `read` scope can list and read; pricing and
creating need `generate`.

## Try it

> Use Layo to show my balance, available models and influencers. Don't create anything yet.

> Price a 5 second 480p video of my first influencer waving at the camera, and wait for my yes.

## What's here

| Path | What it is |
| --- | --- |
| `plugins/layo/skills/layo/SKILL.md` | The skill, in the [Agent Skills](https://agentskills.io/specification) format |
| `plugins/layo/plugin.json` | Portable plugin manifest (Agent Plugins format, with ChatGPT and Codex details) |
| `plugins/layo/.claude-plugin/plugin.json`, `plugins/layo/.cursor-plugin/plugin.json` | Claude Code and Cursor manifests |
| `plugins/layo/mcp.json`, `plugins/layo/.mcp.json` | The Layo MCP server, in each format |
| `.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`, `.cursor-plugin/marketplace.json` | Marketplace catalogs for Claude Code, Codex and Cursor |
| `scripts/check.mjs` | Checks the skill format, the manifests, and the skill against Layo's [public API contract](https://docs.layo.co/openapi.json) |

## Contributing

Run the checks before opening a pull request. They need Node 18 or later and no API key, and they spend nothing:

```bash
node scripts/check.mjs
```

When you bump the version, change it in every manifest and in the skill's `metadata.version`; the check enforces this.

## Links

- Docs: [docs.layo.co](https://docs.layo.co) ([llms.txt](https://docs.layo.co/llms.txt))
- Privacy: [layo.co/privacy-policy](https://layo.co/privacy-policy)
- Terms: [layo.co/terms-of-use-agreement](https://layo.co/terms-of-use-agreement)

## License

[MIT](LICENSE). The Layo name and logo are Layo's trademarks and aren't covered by the license.
