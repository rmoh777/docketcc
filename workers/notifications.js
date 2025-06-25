// DocketCC Notifications Worker - Runs every hour
// Sends email notifications to users about new filings

import { Database } from '../src/lib/database.js';

export default {
	async scheduled(event, env, ctx) {
		console.log('Starting notifications worker...');

		try {
			const db = new Database(env);

			// Get users who need notifications
			const usersToNotify = await db.getUsersForNotification();
			console.log(`Found ${usersToNotify.length} users to potentially notify`);

			let notificationsSent = 0;

			for (const user of usersToNotify) {
				try {
					// Get new filings for this user's subscriptions
					const newFilings = await db.getNewFilingsForUser(user.id);
					
					if (newFilings.length === 0) {
						continue; // No new filings for this user
					}

					// Send notification email
					const emailSent = await sendNotificationEmail(user, newFilings, env);
					
					if (emailSent) {
						// Update last notification time for user's subscriptions
						await db.updateLastNotificationTime(user.id);
						notificationsSent++;
						console.log(`Notification sent to ${user.email} for ${newFilings.length} new filings`);
					}

					// Rate limiting delay
					await new Promise((resolve) => setTimeout(resolve, 1000));
				} catch (error) {
					console.error(`Error sending notification to user ${user.id}:`, error);
					continue;
				}
			}

			console.log(`Notifications completed. Sent ${notificationsSent} notifications.`);
		} catch (error) {
			console.error('Notifications worker failed:', error);
		}
	},

	// Handle manual triggers via HTTP
	async fetch(request, env, ctx) {
		if (request.method === 'POST' && new URL(request.url).pathname === '/trigger') {
			// Manual trigger for testing
			await this.scheduled(null, env, ctx);
			return new Response('Notifications triggered manually', { status: 200 });
		}
		
		return new Response('DocketCC Notifications Worker', { status: 200 });
	}
};

// Email notification function
async function sendNotificationEmail(user, filings, env) {
	try {
		// Group filings by docket for better email organization
		const filingsByDocket = {};
		for (const filing of filings) {
			if (!filingsByDocket[filing.docket_number]) {
				filingsByDocket[filing.docket_number] = {
					docket_title: filing.docket_title,
					filings: []
				};
			}
			filingsByDocket[filing.docket_number].filings.push(filing);
		}

		// Create email content
		const emailSubject = `DocketCC: ${filings.length} new filing${filings.length > 1 ? 's' : ''} in your subscriptions`;
		
		let emailBody = `Hello ${user.name || 'DocketCC User'},\n\n`;
		emailBody += `You have ${filings.length} new filing${filings.length > 1 ? 's' : ''} in your subscribed dockets:\n\n`;

		for (const [docketNumber, docketInfo] of Object.entries(filingsByDocket)) {
			emailBody += `📋 Docket ${docketNumber}: ${docketInfo.docket_title}\n`;
			for (const filing of docketInfo.filings) {
				emailBody += `  • ${filing.title}\n`;
				if (filing.summary && filing.summary !== 'Processing...') {
					emailBody += `    Summary: ${filing.summary}\n`;
				}
				emailBody += `    Filed: ${new Date(filing.filed_at).toLocaleDateString()}\n`;
				emailBody += `    View: ${filing.filing_url}\n\n`;
			}
		}

		emailBody += `\nView all your subscriptions: https://docketcc.pages.dev/dashboard\n\n`;
		emailBody += `Best regards,\nThe DocketCC Team`;

		// Send email using Resend (or other email service)
		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.RESEND_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				from: 'DocketCC <notifications@docketcc.com>',
				to: [user.email],
				subject: emailSubject,
				text: emailBody,
			}),
		});

		if (!response.ok) {
			console.error('Email send failed:', await response.text());
			return false;
		}

		return true;
	} catch (error) {
		console.error('Error sending email:', error);
		return false;
	}
} 