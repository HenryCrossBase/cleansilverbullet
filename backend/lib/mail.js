const { Resend } = require('resend');
const { RESEND_API_KEY, APP_BASE_URL } = require('../env');

let resendClient = null;

if (RESEND_API_KEY) {
    resendClient = new Resend(RESEND_API_KEY);
}

/**
 * Helper to dispatch beautiful HTML emails using Resend.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email Subject
 * @param {string} htmlContent - HTML body content
 */
async function sendSilverbulletEmail(to, subject, htmlContent) {
    if (!resendClient) {
        console.warn(`[MAILER WARNING] Cannot send email to ${to} - RESEND_API_KEY is not configured!`);
        return false;
    }

    try {
        const { data, error } = await resendClient.emails.send({
            // NOTE: Replace this domain with your authenticated Resend domain once configured
            from: 'Silverbullet <noreply@silverbullet.to>', 
            to: [to],
            subject: subject,
            html: htmlContent,
        });

        if (error) {
            console.error('[MAILER ERROR]', error);
            return false;
        }

        console.log(`[MAILER SUCCESS] Email sent to ${to} | ID: ${data.id}`);
        return true;
    } catch (err) {
        console.error('[MAILER CRITICAL]', err);
        return false;
    }
}

/**
 * Send the Account Verification Email
 */
async function sendVerificationEmail(toEmail, username, token) {
    const verifyLink = `${APP_BASE_URL}/api/auth/verify?token=${token}`;
    const subject = `Action Required: Verify Your Silverbullet Account`;
    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; padding: 50px 20px; color: #333333;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
                <div style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #111111; letter-spacing: -0.5px; text-transform: uppercase;">Silverbullet</h1>
                </div>
                <div style="padding: 0 40px 40px 40px;">
                    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px; color: #333333;">
                        Hello <strong>${username}</strong>,
                    </p>
                    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px; color: #555555;">
                        Welcome to Silverbullet. To ensure the security of our platform and gain full access to your account, please verify your email address by clicking the secure link below.
                    </p>
                    <div style="text-align: center; margin-bottom: 32px;">
                        <a href="${verifyLink}" style="display: inline-block; background-color: #111111; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Verify Email Address</a>
                    </div>
                    <p style="font-size: 13px; line-height: 1.5; color: #888888; text-align: center;">
                        If you did not create an account using this email address, please safely ignore this email.
                    </p>
                </div>
                <div style="background-color: #fafafa; padding: 24px; text-align: center; border-top: 1px solid #eeeeee;">
                    <p style="font-size: 12px; color: #aaaaaa; margin: 0;">&copy; ${new Date().getFullYear()} Silverbullet. All rights reserved.</p>
                </div>
            </div>
        </div>
    `;
    return sendSilverbulletEmail(toEmail, subject, html);
}

/**
 * Send Password Recovery Email
 */
async function sendRecoveryEmail(toEmail, token) {
    const recoveryLink = `${APP_BASE_URL}/auth/recovery?token=${token}`;
    const subject = `Reset your password`;
    const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; padding: 50px 20px; color: #333333;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
                <div style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #111111; letter-spacing: -0.5px; text-transform: uppercase;">Silverbullet</h1>
                </div>
                <div style="padding: 0 40px 40px 40px;">
                    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px; color: #333333;">
                        Password Reset Request
                    </p>
                    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 32px; color: #555555;">
                        We received a request to reset the password for the account associated with this email address. Please click the button below to establish a new password. This link will safely expire in 15 minutes.
                    </p>
                    <div style="text-align: center; margin-bottom: 32px;">
                        <a href="${recoveryLink}" style="display: inline-block; background-color: #111111; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Reset Password</a>
                    </div>
                    <p style="font-size: 13px; line-height: 1.5; color: #888888; text-align: center;">
                        If you did not request a password reset, you may ignore this email. Your account remains completely secure.
                    </p>
                </div>
                <div style="background-color: #fafafa; padding: 24px; text-align: center; border-top: 1px solid #eeeeee;">
                    <p style="font-size: 12px; color: #aaaaaa; margin: 0;">&copy; ${new Date().getFullYear()} Silverbullet. All rights reserved.</p>
                </div>
            </div>
        </div>
    `;
    return sendSilverbulletEmail(toEmail, subject, html);
}

module.exports = {
    sendVerificationEmail,
    sendRecoveryEmail
};
