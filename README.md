# UR-ly - Early Alert for UR

A lightweight Cloudflare Worker service that monitors UR (Urban Renaissance) property vacancies and sends notifications when rooms become available.

## Features

- **Daily Automated Checks**: Cron trigger runs every day at 8:00 AM JST
- **Slack Notifications**: Rich formatted messages sent to Slack via webhooks
- **Customizable Thresholds**: Set minimum vacancy count for notifications
- **Simple Web Interface**: HTML form to register subscriptions
- **RESTful API**: Endpoints for subscription management
- **Cloudflare KV Storage**: Free-tier friendly data persistence

## Tech Stack

- **Cloudflare Workers** - Serverless execution
- **KV Namespace** - Key-value storage for subscriptions
- **Cron Triggers** - Scheduled daily checks
- **TypeScript** - Type-safe development

## Getting Started

### Prerequisites

- Node.js installed
- Cloudflare account
- Wrangler CLI configured

### Installation

```bash
npm install
```

### Development

Run the worker locally:

```bash
npm run dev
```

Visit `http://localhost:8787` to see the registration form.

### Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## API Endpoints

### `GET /`
Serves the HTML registration form

### `POST /subscribe`
Register a new subscription

**Request Body:**
```json
{
  "propertyUrl": "https://www.ur-net.go.jp/chintai/api/...",
  "webhookUrl": "https://hooks.slack.com/services/...",
  "threshold": 1
}
```

**Response:**
```json
{
  "success": true,
  "id": "uuid"
}
```

### `GET /subscriptions`
List all active subscriptions (for debugging)

**Response:**
```json
{
  "count": 2,
  "subscriptions": [...]
}
```

### `DELETE /unsubscribe/{id}`
Remove a subscription

**Response:**
```json
{
  "success": true
}
```

## Configuration

### Cron Schedule

Modify the cron schedule in [wrangler.jsonc](wrangler.jsonc):

```jsonc
"triggers": {
  "crons": ["0 23 * * *"]  // 8:00 AM JST every day (UTC 23:00)
}
```

### KV Namespace

The KV namespace is already configured in [wrangler.jsonc](wrangler.jsonc):

```jsonc
"kv_namespaces": [
  {
    "binding": "UR_LY",
    "id": "439fbc2e270f4ab2a9034019527634b1",
    "remote": true
  }
]
```

## Setting Up Slack Notifications

1. Create a Slack App at https://api.slack.com/apps
2. Enable Incoming Webhooks
3. Create a webhook for your channel
4. Use the webhook URL in the registration form

## Data Structure

Subscriptions are stored in KV with the key pattern `subscription:{uuid}`:

```typescript
{
  id: string;
  propertyUrl: string;
  slackWebhookUrl: string;
  threshold: number;
  createdAt: string;
  lastChecked?: string;
  lastNotified?: string;
}
```

## How It Works

1. Users submit a UR property API URL and Slack webhook URL via the web form
2. Subscription is stored in Cloudflare KV
3. Daily cron trigger runs at 8:00 AM JST (UTC 23:00)
4. Worker fetches each subscribed property URL
5. If vacancy count >= threshold, sends notification to Slack
6. Updates subscription with last checked/notified timestamps

## Customization

### Adjusting UR API Response Parsing

The vacancy count extraction logic is in [src/index.ts](src/index.ts):

```typescript
const vacancyCount = data.remainingRoomCount ?? data.totalCount ?? 0;
```

Modify this based on the actual UR API response structure.

### Notification Message Format

Customize notification messages in [src/notifications.ts](src/notifications.ts).

## Development Commands

- `npm run dev` - Start local development server
- `npm run deploy` - Deploy to Cloudflare
- `npm run cf-typegen` - Regenerate TypeScript types
- `npm test` - Run tests

## License

MIT

## Contributing

Feel free to submit issues and pull requests!
