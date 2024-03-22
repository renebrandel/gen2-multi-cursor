import { util, extensions } from '@aws-appsync/utils'
export const request = () => ({ payload: null });

export function response(ctx) {
	const filter = {
			roomId: { eq: ctx.arguments.roomId }
	}
	extensions.setSubscriptionFilter(util.transform.toSubscriptionFilter(filter))
	return null;
}