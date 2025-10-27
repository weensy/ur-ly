export interface Subscription {
	id: string;
	propertyUrl: string;
	shisya: string;
	danchi: string;
	slackWebhookUrl: string;
	threshold: number; // vacancy count threshold
	createdAt: string;
	lastChecked?: string;
	lastNotified?: string;
}

export interface URPropertyResponse {
	count: number;
	rent_low_commonfee: number;
	rent_high_commonfee: number;
	rent_low: number;
	rent_high: number;
	room: any[];
	// Add other fields as needed
}
