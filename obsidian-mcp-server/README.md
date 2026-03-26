# obsidian-mcp-server

MCP server that connects Claude to your Obsidian vault via the [Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) community plugin.

## What it can do

| Tool | What it does |
|---|---|
| `obsidian_read_note` | Read any note by path |
| `obsidian_list_vault` | List files/folders in the vault |
| `obsidian_search` | Full-text search across all notes |
| `obsidian_create_note` | Create a new note |
| `obsidian_update_note` | Append / prepend / replace content in a note |
| `obsidian_delete_note` | Delete a note |
| `obsidian_get_active_note` | Read the note currently open in Obsidian |
| `obsidian_append_to_active` | Append to the currently open note |
| `obsidian_daily_note` | Read or update today's daily note |
| `obsidian_list_tags` | List all vault tags with usage counts |
| `obsidian_open_note` | Open a note in the Obsidian UI |

## Setup

### 1. Install the Obsidian plugin

In Obsidian → Settings → Community plugins → Browse → search **"Local REST API"** → Install → Enable.

Copy the **API Key** shown in the plugin settings. You can also change the port (default: 27124).

### 2. Build the MCP server

```bash
cd obsidian-mcp-server
npm install
npm run build
```

### 3. Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": ["/absolute/path/to/smmluxurylistings/obsidian-mcp-server/dist/index.js"],
      "env": {
        "OBSIDIAN_API_KEY": "your-api-key-from-plugin-settings"
      }
    }
  }
}
```

Restart Claude Desktop. You should see "obsidian" appear as a connected MCP server.

### Optional: custom host/port

If you changed the port in the plugin settings, add `OBSIDIAN_HOST`:

```json
"env": {
  "OBSIDIAN_API_KEY": "your-key",
  "OBSIDIAN_HOST": "https://127.0.0.1:27124"
}
```

## Usage examples

Once connected, you can say things like:

- *"Read my note at Projects/luxury-listings-strategy.md"*
- *"Search my vault for 'content calendar'"*
- *"What's in today's daily note?"*
- *"Append a new bullet to my active note: reviewed Q1 performance"*
- *"Create a note at Clients/new-client.md with this brief: ..."*
- *"Show me all my tags"*

## Security note

The server uses `rejectUnauthorized: false` to accept Obsidian's self-signed certificate. Traffic stays entirely local (127.0.0.1), so this is safe.

## Development

```bash
npm run dev   # Watch mode with tsx
npm run build # Compile TypeScript → dist/
```
