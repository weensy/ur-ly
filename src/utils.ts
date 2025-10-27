/**
 * Extract shisya and danchi from UR property URL
 * Example: https://www.ur-net.go.jp/chintai/kanto/tokyo/20_7140.html
 * Returns: { shisya: '20', danchi: '7140' }
 */
export function extractUrPropertyIds(url: string): { shisya: string; danchi: string } | null {
	try {
		const urlObj = new URL(url);
		const pathname = urlObj.pathname;

		// Match pattern like /chintai/kanto/tokyo/20_7140.html
		const match = pathname.match(/\/(\d+)_(\d+)\.html$/);

		if (!match) {
			return null;
		}

		return {
			shisya: match[1],
			danchi: match[2],
		};
	} catch (error) {
		return null;
	}
}

/**
 * Build the API payload for UR property search
 */
export function buildUrApiPayload(shisya: string, danchi: string): string {
	const params = new URLSearchParams({
		rent_low: '',
		rent_high: '',
		floorspace_low: '',
		floorspace_high: '',
		shisya: shisya,
		danchi: danchi,
		shikibetu: '0',
		newBukkenRoom: '',
		orderByField: '0',
		orderBySort: '0',
		pageIndex: '0',
		sp: '',
	});

	return params.toString();
}
