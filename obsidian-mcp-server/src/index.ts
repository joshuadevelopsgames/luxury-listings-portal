#!/usr/bin/env node
/**
 * obsidian-mcp-server
 *
 * MCP server that wraps the Obsidian Local REST API plugin.
 * Exposes tools to read, write, search, and manage notes in your Obsidian vault.
 *
 * Prerequisites:
 *   • Obsidian must be running
 *   • "Local REST API" community plugin must be installed and enabled
 *   • Set env vars:
 *       OBSIDIAN_API_KEY   — API key shown in the plugin settings
 *       OBSIDIAN_HOST      — defaults to https://127.0.0.1:27124
 *
 * Usage (Claude Desktop claude_desktop_config.json):
 * {
 *   "mcpServers": {
 *     "obsidian": {
 *       "command": "node",
 *       "args": ["/path/to/obsidian-mcp-server/dist/index.js"],
 *       "env": {
 *         "OBSIDIAN_API_KEY": "your-api-key-here"
 *       }
 *     }
 *   }
 * }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios, { AxiosError, AxiosInstance } from "axios";
import https from "https";
import { z } from "zod";

// ── Constants ─────────────────────────────────────────────────────────────────

const CHARACTER_LIMIT = 25_000;
const DEFAULT_HOST    = "https://127.0.0.1:27124";

// ── API client ────────────────────────────────────────────────────────────────

function buildClient(): AxiosInstance {
  const apiKey = process.env.OBSIDIAN_API_KEY;
  if (!apiKey) {
    console.error("ERROR: OBSIDIAN_API_KEY environment variable is required.");
    process.exit(1);
  }
  const host = (process.env.OBSIDIAN_HOST || DEFAULT_HOST).replace(/\/$/, "");

  return axios.create({
    baseURL: host,
    timeout: 15_000,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    // Obsidian serves over HTTPS with a self-signed cert — disable verification
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  });
}

const client = buildClient();

// ── Error handling ─────────────────────────────────────────────────────────────

function handleError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.code === "ECONNREFUSED" || error.code === "ECONNRESET") {
      return "Error: Cannot connect to Obsidian. Make sure Obsidian is running and the Local REST API plugin is enabled.";
    }
    if (error.response) {
      const status = error.response.status;
      const msg    = (error.response.data as { message?: string })?.message || "";
      switch (status) {
        case 401: return "Error: Invalid API key. Check your OBSIDIAN_API_KEY setting.";
        case 403: return "Error: Access denied. Check your API key permissions.";
        case 404: return `Error: Note or path not found. ${msg}`.trim();
        case 405: return "Error: Operation not permitted. The vault may be in read-only mode.";
        default:  return `Error: Obsidian API returned status ${status}. ${msg}`.trim();
      }
    }
  }
  return `Error: ${error instanceof Error ? error.message : String(error)}`;
}

function truncate(text: string, limit = CHARACTER_LIMIT): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit) + `\n\n[...truncated — ${text.length} chars total, showing first ${limit}]`;
}

// ── MCP server ────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "obsidian-mcp-server",
  version: "1.0.0",
});

// ── Tool: obsidian_read_note ──────────────────────────────────────────────────

server.registerTool(
  "obsidian_read_note",
  {
    title: "Read Note",
    description: `Read the full content of a note in your Obsidian vault by its path.

Args:
  - path (string): Vault-relative path including extension, e.g. "Projects/client-notes.md"

Returns:
  The raw markdown content of the note.

Examples:
  - "Show me the client brief" → path: "Clients/client-brief.md"
  - "What's in my daily note?" → path: "Daily/2026-03-26.md"

Errors:
  - Returns "Error: Note or path not found" if the path doesn't exist`,
    inputSchema: z.object({
      path: z.string().min(1).describe("Vault-relative path to the note, e.g. 'Projects/ideas.md'"),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ path }) => {
    try {
      const encodedPath = path.split("/").map(encodeURIComponent).join("/");
      const res = await client.get<string>(`/vault/${encodedPath}`, {
        headers: { Accept: "text/markdown" },
        responseType: "text",
      });
      return { content: [{ type: "text", text: truncate(res.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleError(error) }] };
    }
  }
);

// ── Tool: obsidian_list_vault ─────────────────────────────────────────────────

server.registerTool(
  "obsidian_list_vault",
  {
    title: "List Vault Files",
    description: `List files and folders in your Obsidian vault.

Args:
  - path (string): Directory to list. Use "" or "/" for the vault root. Example: "Projects/"
  - filter (string, optional): Only return entries whose name contains this string (case-insensitive)

Returns:
  A list of file and folder names at the given path.

Examples:
  - "What folders are in my vault?" → path: ""
  - "List all files in Projects" → path: "Projects"`,
    inputSchema: z.object({
      path:   z.string().default("").describe("Directory path relative to vault root"),
      filter: z.string().optional().describe("Optional filename filter substring"),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ path, filter }) => {
    try {
      const dir = path ? path.replace(/\/?$/, "/") : "/";
      const encodedDir = dir.split("/").map(encodeURIComponent).join("/");
      const res = await client.get<{ files: string[] }>(`/vault/${encodedDir}`);
      let files = res.data?.files || [];
      if (filter) {
        const f = filter.toLowerCase();
        files = files.filter((name) => name.toLowerCase().includes(f));
      }
      const text = files.length
        ? files.map((f) => `• ${f}`).join("\n")
        : `No files found at "${path || "/"}"${filter ? ` matching "${filter}"` : ""}.`;
      return { content: [{ type: "text", text: truncate(text) }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleError(error) }] };
    }
  }
);

// ── Tool: obsidian_search ─────────────────────────────────────────────────────

server.registerTool(
  "obsidian_search",
  {
    title: "Search Vault",
    description: `Full-text search across all notes in your Obsidian vault.

Args:
  - query (string): Search term(s). Supports simple keywords and phrases.
  - context_length (number, optional): Characters of context to return per match (default: 200)
  - limit (number, optional): Max number of results to return (default: 20, max: 100)

Returns:
  A list of matching notes with scored context snippets showing where the query appears.

Examples:
  - "Find notes about the Smith account" → query: "Smith account"
  - "Search for content strategy notes" → query: "content strategy"`,
    inputSchema: z.object({
      query:          z.string().min(1).describe("Search term(s) to find in the vault"),
      context_length: z.number().int().min(50).max(2000).default(200).describe("Characters of context per match (default: 200)"),
      limit:          z.number().int().min(1).max(100).default(20).describe("Max results to return (default: 20)"),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ query, context_length, limit }) => {
    try {
      const res = await client.post<Array<{ filename: string; score: number; matches: Array<{ context: string }> }>>(
        "/search/simple/",
        null,
        { params: { query, contextLength: context_length } }
      );
      const results = (res.data || []).slice(0, limit);
      if (!results.length) {
        return { content: [{ type: "text", text: `No results found for "${query}".` }] };
      }
      const lines: string[] = [`# Search: "${query}" — ${results.length} result(s)\n`];
      for (const r of results) {
        lines.push(`## ${r.filename}  _(score: ${r.score.toFixed(2)})_`);
        for (const m of r.matches || []) {
          lines.push(`> ${m.context.replace(/\n/g, " ")}`);
        }
        lines.push("");
      }
      return { content: [{ type: "text", text: truncate(lines.join("\n")) }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleError(error) }] };
    }
  }
);

// ── Tool: obsidian_create_note ────────────────────────────────────────────────

server.registerTool(
  "obsidian_create_note",
  {
    title: "Create Note",
    description: `Create a new note in your Obsidian vault. Fails if the note already exists.

Args:
  - path (string): Vault-relative path including .md extension, e.g. "Projects/new-idea.md"
  - content (string): Full markdown content for the note
  - overwrite (boolean, optional): If true, overwrite an existing note at this path (default: false)

Returns:
  Confirmation message with the path of the created note.

Examples:
  - "Create a note for the new client" → path: "Clients/new-client.md", content: "..."`,
    inputSchema: z.object({
      path:      z.string().min(1).describe("Vault-relative path for the new note, must end in .md"),
      content:   z.string().describe("Full markdown content of the note"),
      overwrite: z.boolean().default(false).describe("Overwrite if the note already exists (default: false)"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ path, content, overwrite }) => {
    try {
      const encodedPath = path.split("/").map(encodeURIComponent).join("/");
      const method = overwrite ? "put" : "post";
      await client[method](`/vault/${encodedPath}`, content, {
        headers: { "Content-Type": "text/markdown" },
      });
      return { content: [{ type: "text", text: `✅ Note created: ${path}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleError(error) }] };
    }
  }
);

// ── Tool: obsidian_update_note ────────────────────────────────────────────────

server.registerTool(
  "obsidian_update_note",
  {
    title: "Update Note",
    description: `Update an existing note in your Obsidian vault — append, prepend, or replace content.

Args:
  - path (string): Vault-relative path to the note, e.g. "Projects/client-notes.md"
  - content (string): Content to insert or use as replacement
  - operation (string): "append" | "prepend" | "replace" (default: "append")
  - target_type (string, optional): "heading" | "block" | "frontmatter" for targeted edits
  - target (string, optional): The heading name, block ref, or frontmatter key to target

Returns:
  Confirmation that the note was updated.

Examples:
  - "Add a section to my project note" → operation: "append", content: "## New Section\\n..."
  - "Update the status field in frontmatter" → target_type: "frontmatter", target: "status", content: "done"`,
    inputSchema: z.object({
      path:        z.string().min(1).describe("Vault-relative path to the note"),
      content:     z.string().describe("Content to write"),
      operation:   z.enum(["append", "prepend", "replace"]).default("append").describe("How to insert the content"),
      target_type: z.enum(["heading", "block", "frontmatter"]).optional().describe("Type of target for precise insertion"),
      target:      z.string().optional().describe("Heading name, block ref, or frontmatter key to target"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ path, content, operation, target_type, target }) => {
    try {
      const encodedPath = path.split("/").map(encodeURIComponent).join("/");
      const headers: Record<string, string> = {
        "Content-Type": "text/markdown",
        "Operation": operation,
      };
      if (target_type) headers["Target-Type"] = target_type;
      if (target)      headers["Target"]      = target;

      await client.patch(`/vault/${encodedPath}`, content, { headers });
      return { content: [{ type: "text", text: `✅ Note updated (${operation}): ${path}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleError(error) }] };
    }
  }
);

// ── Tool: obsidian_delete_note ────────────────────────────────────────────────

server.registerTool(
  "obsidian_delete_note",
  {
    title: "Delete Note",
    description: `Delete a note from your Obsidian vault.

Args:
  - path (string): Vault-relative path to the note, e.g. "Archive/old-note.md"

Returns:
  Confirmation of deletion.

⚠️  This action is permanent. Double-check the path before calling.`,
    inputSchema: z.object({
      path: z.string().min(1).describe("Vault-relative path to the note to delete"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  },
  async ({ path }) => {
    try {
      const encodedPath = path.split("/").map(encodeURIComponent).join("/");
      await client.delete(`/vault/${encodedPath}`);
      return { content: [{ type: "text", text: `🗑️  Note deleted: ${path}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleError(error) }] };
    }
  }
);

// ── Tool: obsidian_get_active_note ────────────────────────────────────────────

server.registerTool(
  "obsidian_get_active_note",
  {
    title: "Get Active Note",
    description: `Read the note that is currently open in Obsidian.

Returns:
  The path and full markdown content of the currently active note.

Use this when the user says "look at what I have open" or "this note" without specifying a path.`,
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async () => {
    try {
      const res = await client.get<string>("/active/", {
        headers: { Accept: "text/markdown" },
        responseType: "text",
      });
      return { content: [{ type: "text", text: truncate(res.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleError(error) }] };
    }
  }
);

// ── Tool: obsidian_append_to_active ──────────────────────────────────────────

server.registerTool(
  "obsidian_append_to_active",
  {
    title: "Append to Active Note",
    description: `Append text to the note that is currently open in Obsidian.

Args:
  - content (string): Markdown text to append

Returns:
  Confirmation message.

Use this when the user says "add this to my current note" or "jot this down".`,
    inputSchema: z.object({
      content: z.string().min(1).describe("Markdown content to append to the active note"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ content }) => {
    try {
      await client.patch("/active/", content, {
        headers: { "Content-Type": "text/markdown", "Operation": "append" },
      });
      return { content: [{ type: "text", text: "✅ Content appended to active note." }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleError(error) }] };
    }
  }
);

// ── Tool: obsidian_daily_note ─────────────────────────────────────────────────

server.registerTool(
  "obsidian_daily_note",
  {
    title: "Get / Update Daily Note",
    description: `Read or update today's daily note in Obsidian.

Args:
  - action (string): "read" | "append" | "prepend" (default: "read")
  - content (string, optional): Content to write (required for append/prepend)

Returns:
  For "read": the content of today's daily note.
  For "append"/"prepend": confirmation message.

Use this for daily standups, quick captures, and end-of-day summaries.`,
    inputSchema: z.object({
      action:  z.enum(["read", "append", "prepend"]).default("read").describe("What to do with today's daily note"),
      content: z.string().optional().describe("Content to write (required for append/prepend)"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ action, content }) => {
    try {
      if (action === "read") {
        const res = await client.get<string>("/periodic/daily/", {
          headers: { Accept: "text/markdown" },
          responseType: "text",
        });
        return { content: [{ type: "text", text: truncate(res.data) }] };
      }

      if (!content) {
        return { content: [{ type: "text", text: "Error: 'content' is required for append/prepend." }] };
      }

      await client.patch("/periodic/daily/", content, {
        headers: { "Content-Type": "text/markdown", "Operation": action },
      });
      return { content: [{ type: "text", text: `✅ Daily note updated (${action}).` }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleError(error) }] };
    }
  }
);

// ── Tool: obsidian_list_tags ──────────────────────────────────────────────────

server.registerTool(
  "obsidian_list_tags",
  {
    title: "List Tags",
    description: `List all tags used in your Obsidian vault along with their usage count.

Returns:
  A sorted list of tags and how many notes use each one.

Use this to understand your vault's tagging structure or find notes by topic.`,
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async () => {
    try {
      const res = await client.get<Record<string, number>>("/tags/");
      const tags = Object.entries(res.data || {})
        .sort((a, b) => b[1] - a[1])
        .map(([tag, count]) => `• #${tag} (${count})`);
      const text = tags.length
        ? `# Vault Tags (${tags.length} total)\n\n${tags.join("\n")}`
        : "No tags found in the vault.";
      return { content: [{ type: "text", text: truncate(text) }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleError(error) }] };
    }
  }
);

// ── Tool: obsidian_open_note ──────────────────────────────────────────────────

server.registerTool(
  "obsidian_open_note",
  {
    title: "Open Note in Obsidian",
    description: `Open a specific note in the Obsidian UI (bring it into view).

Args:
  - path (string): Vault-relative path to the note to open

Returns:
  Confirmation that Obsidian has opened the note.

Use this when the user wants to navigate to a note while also in a Claude conversation.`,
    inputSchema: z.object({
      path: z.string().min(1).describe("Vault-relative path to the note to open"),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ path }) => {
    try {
      const encodedPath = path.split("/").map(encodeURIComponent).join("/");
      await client.post(`/open/${encodedPath}`);
      return { content: [{ type: "text", text: `✅ Opened in Obsidian: ${path}` }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleError(error) }] };
    }
  }
);

// ── Start ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("obsidian-mcp-server running via stdio");
}

main().catch((error: unknown) => {
  console.error("Server error:", error);
  process.exit(1);
});
