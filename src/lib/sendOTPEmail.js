import nodemailer from 'nodemailer';

export async function sendOTPEmail(email, otp) {
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, // e.g., smtp.gmail.com
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Email content
    const mailOptions = {
    from: `"YesCity" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Email – YesCity OTP Code',

    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e5e7eb;">
        
        <!-- Header -->
        <div style="text-align: center; padding-bottom: 10px;">
            <h1 style="color: #0ea5e9; margin: 0; font-size: 28px; font-weight: bold;">Welcome to YesCity</h1>
            <p style="color: #555; margin-top: 4px; font-size: 14px; font-style: italic;">
            “Explore Cities, Discover Authenticity”
            </p>
        </div>

        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">

        <!-- Main Body -->
        <p style="color: #333; font-size: 16px;">
            Thank you for signing up with <strong>YesCity</strong>! To complete your registration and keep your account secure, please verify your email using the OTP code below:
        </p>

        <div style="
            background: #f0f9ff; 
            padding: 20px; 
            text-align: center; 
            border-radius: 10px; 
            margin: 25px 0; 
            border: 1px solid #bae6fd;">
            <h1 style="margin: 0; font-size: 36px; letter-spacing: 6px; color: #0369a1;">
            ${otp}
            </h1>
        </div>

        <p style="color: #333; font-size: 16px;">
            This OTP is valid for <strong>10 minutes</strong>.  
            If you did not request this verification, you can safely ignore this email.
        </p>

        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #999; font-size: 12px; text-align: center;">
            This is an automated email — please do not reply.<br>
            © YesCity. All rights reserved.
        </p>
        </div>
    `,
    };


  // Send email
  await transporter.sendMail(mailOptions);
}