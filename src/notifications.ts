export async function sendSlackNotification(
	webhookUrl: string,
	message: string,
	propertyUrl: string,
	vacancyCount: number
): Promise<boolean> {
	try {
		const response = await fetch(webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				text: message,
				blocks: [
					{
						type: 'section',
						text: {
							type: 'mrkdwn',
							text: `*UR-ly Alert*\n${message}`,
						},
					},
					{
						type: 'section',
						fields: [
							{
								type: 'mrkdwn',
								text: `*Available Rooms:*\n${vacancyCount}`,
							},
							{
								type: 'mrkdwn',
								text: `*Property URL:*\n<${propertyUrl}|View Property>`,
							},
						],
					},
				],
			}),
		});

		return response.ok;
	} catch (error) {
		console.error('Failed to send Slack notification:', error);
		return false;
	}
}
