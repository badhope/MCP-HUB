# API Reference

**Version**: 2.0.1  
**Title**: MCP Hub API  
**Description**: API for exploring Model Context Protocol (MCP) servers  

Interactive docs: `/docs` (Swagger UI) and `/redoc` (ReDoc) on a running server.

---

## Endpoints

### `GET /`

**API Health Check**

Health check endpoint that returns basic API information

*Tags*: Health  

### `POST /comments/add`

**Add comment**

Add a comment to a server

*Tags*: User Functions  

**Body** (application/json): `CommentRequest`

### `GET /comments/{server_name}`

**Get comments for server**

Get all comments for a server

*Tags*: User Functions  

**Parameters**:

- `server_name` (path, string, required) — 

### `GET /compare`

**Compare multiple servers**

Compare multiple servers side by side.
Returns detailed comparison with quality scores, features, and recommendations.

*Tags*: Comparison  

**Parameters**:

- `servers` (query, string, required) — Comma-separated server names to compare

### `GET /config/{name}`

**Get server config**

Generate a configuration example for an MCP server.
This includes installation commands, MCP config, and Docker configuration.

*Tags*: Configuration  

**Parameters**:

- `name` (path, string, required) — 

### `POST /export/batch-json`

**Batch export configs as JSON**

Export configurations for multiple servers as a single combined JSON file.
All mcpServers entries are merged into one configuration object.

*Tags*: Export  

**Body** (application/json): `BatchExportRequest`

### `POST /export/batch-markdown`

**Batch export as Markdown**

Export a combined Markdown installation guide for multiple servers.
Includes a table of contents, combined configuration, and individual server sections.

*Tags*: Export  

**Body** (application/json): `BatchExportRequest`

### `GET /export/markdown/{name}`

**Export server as Markdown**

Generate a Markdown installation guide for a specific server.
Returns the Markdown content as plain text.

*Tags*: Export  

**Parameters**:

- `name` (path, string, required) — 

### `POST /favorites/add`

**Add server to favorites**

Add a server to user's favorites

*Tags*: User Functions  

**Body** (application/json): `FavoriteRequest`

### `GET /favorites/check/{user_id}/{server_name}`

**Check if favorited**

Check if a server is in user's favorites

*Tags*: User Functions  

**Parameters**:

- `user_id` (path, string, required) — 
- `server_name` (path, string, required) — 

### `GET /favorites/count/{server_name}`

**Get favorite count for server**

Get total number of users who have favorited this server

*Tags*: User Functions  

**Parameters**:

- `server_name` (path, string, required) — 

### `POST /favorites/remove`

**Remove server from favorites**

Remove a server from user's favorites

*Tags*: User Functions  

**Body** (application/json): `FavoriteRequest`

### `GET /favorites/{user_id}`

**Get user's favorites**

Get list of server names in user's favorites

*Tags*: User Functions  

**Parameters**:

- `user_id` (path, string, required) — 

### `POST /ratings/add`

**Add or update rating**

Add or update a user's rating for a server

*Tags*: User Functions  

**Body** (application/json): `RatingRequest`

### `GET /ratings/user/{user_id}/{server_name}`

**Get user's rating**

Get a specific user's rating for a server

*Tags*: User Functions  

**Parameters**:

- `user_id` (path, string, required) — 
- `server_name` (path, string, required) — 

### `GET /ratings/{server_name}`

**Get ratings for server**

Get all ratings for a server

*Tags*: User Functions  

**Parameters**:

- `server_name` (path, string, required) — 

### `GET /recommend/for-use-case`

**Get servers for a specific use case**

Recommend servers for a specific use case.
Uses keyword matching across name, description, categories, and topics.

*Tags*: Recommendations  

**Parameters**:

- `use_case` (query, string, required) — Use case description (e.g., 'web scraping', 'database access')
- `limit` (query, integer, optional) — Number of servers to return

### `GET /recommend/similar`

**Get similar servers**

Find servers similar to the given server based on categories and topics.

*Tags*: Recommendations  

**Parameters**:

- `name` (query, string, required) — Server name to find similar servers for
- `limit` (query, integer, optional) — Number of similar servers to return

### `GET /server-stats/{server_name}`

**Get server stats**

Get comprehensive stats for a server (favorites, ratings, comments)

*Tags*: User Functions  

**Parameters**:

- `server_name` (path, string, required) — 

### `GET /servers`

**List servers with filters**

Get a filtered list of MCP servers.
Supports search, category, language, and star count filtering.
Results are paginated by limit parameter.

*Tags*: Servers  

**Parameters**:

- `search` (query, ?, optional) — Search servers by name or description
- `category` (query, ?, optional) — Filter by category
- `language` (query, ?, optional) — Filter by programming language
- `sort` (query, string, optional) — Sort by 'stars' or 'updated'
- `min_stars` (query, integer, optional) — Minimum star count filter
- `limit` (query, integer, optional) — Max number of results per request

### `GET /servers/by-category/{category}`

**Get servers by category**

Get all servers in a specific category, optionally filtered by minimum stars

*Tags*: Servers  

**Parameters**:

- `category` (path, string, required) — 
- `min_stars` (query, integer, optional) — Minimum star count
- `limit` (query, integer, optional) — Max number of results

### `GET /servers/by-quality`

**Get servers filtered by quality score**

Get servers filtered by quality score.
- min_score: Minimum quality score (0-100)
- level: Quality level (S=85+, A=70+, B=55+, C=40+, D=<40)

*Tags*: Servers  

**Parameters**:

- `min_score` (query, integer, optional) — Minimum quality score (0-100)
- `level` (query, string, optional) — Quality level filter: S, A, B, C, or D
- `limit` (query, integer, optional) — Max number of results

### `GET /servers/curated`

**Get curated popular servers**

A curated list of popular and useful MCP servers

*Tags*: Servers  

**Parameters**:

- `limit` (query, integer, optional) — Number of results

### `GET /servers/popular`

**Get most popular servers**

Get the top N most starred servers

*Tags*: Servers  

**Parameters**:

- `limit` (query, integer, optional) — Number of results

### `GET /servers/recent`

**Get recently updated servers**

Get the N most recently updated servers

*Tags*: Servers  

**Parameters**:

- `limit` (query, integer, optional) — Number of results

### `GET /servers/{name}`

**Get a single server by name**

Get detailed information about a specific server by name

*Tags*: Servers  

**Parameters**:

- `name` (path, string, required) — 

### `GET /stats`

**Get API statistics**

Get overall market statistics including total servers and categories

*Tags*: Stats  

### `GET /stats/all`

**Get overall stats**

Get overall platform statistics

*Tags*: User Functions  

### `GET /submissions`

**Get submissions**

Get all submissions, optionally filtered by status

*Tags*: Submissions  

**Parameters**:

- `status` (query, ?, optional) — 

### `POST /submissions/review`

**Review submission**

Review a submission (approve or reject)

*Tags*: Submissions  

**Body** (application/json): `ReviewRequest`

### `POST /submissions/submit`

**Submit a new server**

Submit a new server for review

*Tags*: Submissions  

**Body** (application/json): `SubmissionRequest`

### `GET /submissions/user/{user_id}`

**Get user's submissions**

Get all submissions by a user

*Tags*: Submissions  

**Parameters**:

- `user_id` (path, string, required) — 

### `GET /user-stats/{user_id}`

**Get user stats**

Get statistics for a user

*Tags*: User Functions  

**Parameters**:

- `user_id` (path, string, required) — 

### `GET /validate/all`

**Validate all servers**

Validate all servers and return summary report.
Use sparingly - this can be slow for large datasets.

*Tags*: Validation  

### `GET /validate/health`

**Get data health report**

Get comprehensive data health report with recommendations.

*Tags*: Validation  

### `GET /validate/low-quality`

**Get low quality servers**

Get servers with validation score below threshold.
Default threshold is 40.

*Tags*: Validation  

**Parameters**:

- `threshold` (query, integer, optional) — 

### `GET /validate/server/{name}`

**Validate a single server**

Validate a single server's data quality.
Returns validation report with errors, warnings, and score.

*Tags*: Validation  

**Parameters**:

- `name` (path, string, required) — 
