let resendClientPromise;

const getResendClient = async () => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is missing. Email service will run in MOCK mode.');
    return null;
  }

  if (!resendClientPromise) {
    resendClientPromise = import('resend')
      .then(({ Resend }) => new Resend(process.env.RESEND_API_KEY))
      .catch((error) => {
        console.warn(
          `Resend package is unavailable. Email service will run in MOCK mode. (${error.code || error.message})`
        );
        return null;
      });
  }

  return resendClientPromise;
};

export const sendOtpEmail = async (email, otp) => {
  const resend = await getResendClient();

  if (!resend) {
    console.log(`[EMAIL MOCK] To: ${email}, Subject: Password Reset OTP, Body: Your OTP is ${otp}`);
    return { success: true, mock: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'PhishX <onboarding@resend.dev>',
      to: [email],
      subject: 'Password Reset OTP - PhishX',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your PhishX account. Use the OTP below to complete the process:</p>
          <div style="background: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; border-radius: 8px;">
            ${otp}
          </div>
          <p>This OTP will expire in 10 minutes. If you did not request this, please ignore this email.</p>
          <hr />
          <p style="font-size: 12px; color: #888;">&copy; 2026 PhishX Security. All rights reserved.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend API Error:', error);
      throw new Error(`Email failed: ${error.message || 'Unknown Resend error'}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Email Service Error:', error);
    throw error;
  }
};
