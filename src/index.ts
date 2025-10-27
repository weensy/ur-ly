import type { Subscription, URPropertyResponse } from './types';
import { sendSlackNotification } from './notifications';
import { buildUrApiPayload, extractUrPropertyIds } from './utils';

const LANDING_PAGE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>UR-ly</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			max-width: 600px;
			margin: 50px auto;
			padding: 20px;
			background: #f5f5f5;
		}
		.container {
			background: white;
			padding: 30px;
			border-radius: 10px;
			box-shadow: 0 2px 10px rgba(0,0,0,0.1);
		}
		h1 {
			color: #333;
			margin: 0 0 5px 0;
			font-size: 32px;
			font-weight: 700;
		}
		.subtitle {
			color: #666;
			font-size: 18px;
			font-weight: 400;
			margin: 0;
			margin-bottom: 20px;
		}
		.form-group {
			margin-bottom: 20px;
		}
		label {
			display: block;
			margin-bottom: 5px;
			font-weight: 500;
			color: #555;
		}
		input, select {
			width: 100%;
			padding: 10px;
			border: 1px solid #ddd;
			border-radius: 5px;
			font-size: 14px;
			box-sizing: border-box;
		}
		button[type="submit"] {
			width: 100%;
			padding: 12px;
			background: #0070f3;
			color: white;
			border: none;
			border-radius: 5px;
			font-size: 16px;
			cursor: pointer;
			font-weight: 500;
		}
		button[type="submit"]:hover {
			background: #0051cc;
		}
		.info {
			background: #e3f2fd;
			padding: 15px;
			border-radius: 5px;
			margin-bottom: 20px;
			font-size: 14px;
			color: #1976d2;
		}
		#result {
			margin-top: 20px;
			padding: 10px;
			border-radius: 5px;
			display: none;
		}
		.success { background: #d4edda; color: #155724; display: block; }
		.error { background: #f8d7da; color: #721c24; display: block; }
	</style>
</head>
<body>
	<div class="container">
		<h1>UR-ly</h1>
		<p class="subtitle">: Early Alert for UR</p>
		<div class="info">
			Get notified automatically when vacancies become available in your desired UR property!
		</div>

		<form id="subscribeForm">
			<div class="form-group">
				<label for="propertyUrl">UR Property URL *</label>
				<input type="url" id="propertyUrl" name="propertyUrl" required
					placeholder="https://www.ur-net.go.jp/chintai/kanto/tokyo/00_0000.html">
			</div>

			<div class="form-group">
				<label for="webhookUrl">Slack Webhook URL *</label>
				<input type="url" id="webhookUrl" name="webhookUrl" required
					placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXX...">
			</div>

			<div class="form-group">
				<label for="threshold">Vacancy Threshold (Minimum Count)</label>
				<input type="number" id="threshold" name="threshold" value="1" min="0">
			</div>

			<button type="submit">Subscribe</button>
		</form>

		<div id="result"></div>
	</div>

	<script>
		document.getElementById('subscribeForm').addEventListener('submit', async (e) => {
			e.preventDefault();
			const formData = new FormData(e.target);
			const data = Object.fromEntries(formData);
			const resultDiv = document.getElementById('result');

			try {
				const response = await fetch('/subscribe', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data)
				});

				const result = await response.json();

				if (response.ok) {
					resultDiv.className = 'success';
					resultDiv.textContent = 'Successfully subscribed! ID: ' + result.id;
					resultDiv.style.display = 'block';
					e.target.reset();
				} else {
					throw new Error(result.error || 'Registration failed');
				}
			} catch (error) {
				resultDiv.className = 'error';
				resultDiv.textContent = 'Error: ' + error.message;
				resultDiv.style.display = 'block';
			}
		});
	</script>
</body>
</html>
`;

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		// Serve landing page
		if (url.pathname === '/' && request.method === 'GET') {
			return new Response(LANDING_PAGE_HTML, {
				headers: { 'Content-Type': 'text/html' },
			});
		}

		// Subscribe endpoint
		if (url.pathname === '/subscribe' && request.method === 'POST') {
			return handleSubscribe(request, env);
		}

		// List subscriptions endpoint (for debugging)
		if (url.pathname === '/subscriptions' && request.method === 'GET') {
			return handleListSubscriptions(env);
		}

		// Delete subscription endpoint
		if (url.pathname.startsWith('/unsubscribe/') && request.method === 'DELETE') {
			const id = url.pathname.split('/')[2];
			return handleUnsubscribe(id, env);
		}

		return new Response('Not Found', { status: 404 });
	},

	async scheduled(event, env, ctx): Promise<void> {
		console.log('Running scheduled vacancy check...');
		await checkAllSubscriptions(env);
	},
} satisfies ExportedHandler<Env>;

async function handleSubscribe(request: Request, env: Env): Promise<Response> {
	try {
		const body = await request.json() as any;
		const { propertyUrl, webhookUrl, threshold = 1 } = body;

		if (!propertyUrl || !webhookUrl) {
			return Response.json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Extract shisya and danchi from property URL
		const ids = extractUrPropertyIds(propertyUrl);
		if (!ids) {
			return Response.json({
				error: 'Invalid UR property URL. Expected format: https://www.ur-net.go.jp/chintai/kanto/tokyo/00_0000.html'
			}, { status: 400 });
		}

		const id = crypto.randomUUID();
		const subscription: Subscription = {
			id,
			propertyUrl,
			shisya: ids.shisya,
			danchi: ids.danchi,
			slackWebhookUrl: webhookUrl,
			threshold: parseInt(threshold as string),
			createdAt: new Date().toISOString(),
		};

		await env.UR_LY.put(`subscription:${id}`, JSON.stringify(subscription));

		return Response.json({ success: true, id });
	} catch (error) {
		return Response.json({ error: 'Invalid request' }, { status: 400 });
	}
}

async function handleListSubscriptions(env: Env): Promise<Response> {
	try {
		const list = await env.UR_LY.list({ prefix: 'subscription:' });
		const subscriptions = await Promise.all(
			list.keys.map(async (key) => {
				const value = await env.UR_LY.get(key.name);
				return value ? JSON.parse(value) : null;
			})
		);

		return Response.json({
			count: subscriptions.filter(Boolean).length,
			subscriptions: subscriptions.filter(Boolean),
		});
	} catch (error) {
		return Response.json({ error: 'Failed to list subscriptions' }, { status: 500 });
	}
}

async function handleUnsubscribe(id: string, env: Env): Promise<Response> {
	try {
		await env.UR_LY.delete(`subscription:${id}`);
		return Response.json({ success: true });
	} catch (error) {
		return Response.json({ error: 'Failed to unsubscribe' }, { status: 500 });
	}
}

async function checkAllSubscriptions(env: Env): Promise<void> {
	const list = await env.UR_LY.list({ prefix: 'subscription:' });

	for (const key of list.keys) {
		const value = await env.UR_LY.get(key.name);
		if (!value) continue;

		const subscription: Subscription = JSON.parse(value);
		await checkSubscription(subscription, env);
	}
}

async function checkSubscription(subscription: Subscription, env: Env): Promise<void> {
	try {
		// Build API payload
		const payload = buildUrApiPayload(subscription.shisya, subscription.danchi);

		// Call UR API
		const response = await fetch('https://chintai.r6.ur-net.go.jp/chintai/api/bukken/search/bukken_main/', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
				'Accept': 'application/json, text/javascript, */*; q=0.01',
				'Origin': 'https://www.ur-net.go.jp',
				'Referer': 'https://www.ur-net.go.jp/',
				'Sec-Fetch-Dest': 'empty',
				'Sec-Fetch-Mode': 'cors',
				'Sec-Fetch-Site': 'same-site',
			},
			body: payload,
		});

		if (!response.ok) {
			console.error(`Failed to fetch property data for ${subscription.id}`);
			return;
		}

		const data = await response.json() as URPropertyResponse;

		// Extract vacancy count from API response
		const vacancyCount = data.count;

		// Update last checked time
		subscription.lastChecked = new Date().toISOString();

		// Check if we should notify
		if (vacancyCount >= subscription.threshold) {
			const message = `Vacancy available: ${vacancyCount} room(s) found!`;

			const success = await sendSlackNotification(
				subscription.slackWebhookUrl,
				message,
				subscription.propertyUrl,
				vacancyCount
			);

			if (success) {
				subscription.lastNotified = new Date().toISOString();
				console.log(`Notification sent for subscription ${subscription.id}`);
			}
		}

		// Save updated subscription
		await env.UR_LY.put(`subscription:${subscription.id}`, JSON.stringify(subscription));
	} catch (error) {
		console.error(`Error checking subscription ${subscription.id}:`, error);
	}
}
