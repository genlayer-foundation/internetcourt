# GenLayer Technical Guide

> This document previously contained an inline copy of the GenLayer reference.
> It has been replaced by the canonical source to avoid drift.

## Canonical Reference

GenLayer developer documentation for writing, testing, and deploying intelligent contracts is maintained in the **[genlayer-dev Claude Code plugin](https://github.com/genlayerlabs/skills/tree/main/plugins/genlayer-dev)**.

The plugin includes the following skills:

| Skill | Description |
|-------|-------------|
| `write-contract` | Patterns for writing GenLayer intelligent contracts in Python |
| `genlayer-cli` | CLI reference: deploy, call, write, debug, manage accounts |
| `direct-tests` | Unit testing intelligent contracts with `direct_vm` |
| `integration-tests` | End-to-end testing against a running Studio or testnet |
| `genvm-lint` | Linting and static analysis for GenLayer Python contracts |

### Install

```bash
claude mcp add --transport http https://mcp.genlayerlabs.com/skills/genlayer-dev
```

Or browse the full plugin source:
- **GitHub:** https://github.com/genlayerlabs/skills/tree/main/plugins/genlayer-dev
- **Docs:** https://docs.genlayer.com/
- **SDK Reference:** https://sdk.genlayer.com/main/api/genlayer.html

### Faucet (Testnet Bradbury)

Get free testnet GEN tokens: https://testnet-faucet.genlayer.foundation/
