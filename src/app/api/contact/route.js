import nodemailer from 'nodemailer';

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, email, messageType, message } = body;

        // Validate required fields
        if (!name || !email || !message) {
            return Response.json(
                { success: false, message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Create email transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Verify transporter configuration
        try {
            await transporter.verify();
        } catch (verifyError) {
            return Response.json(
                { success: false, message: 'Email configuration error' },
                { status: 500 }
            );
        }

        // Format message types
        const messageTypeStr = Array.isArray(messageType) && messageType.length > 0 
            ? messageType.join(', ') 
            : 'General';

        // Email to you (receiving the contact form)
        const mailToYou = {
            from: process.env.EMAIL_USER,
            to: process.env.CONTACT_EMAIL || process.env.EMAIL_USER,
            subject: `YesCity Contact: ${messageTypeStr}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #1E88E5, #42A5F5); padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">YesCity Contact Form</h1>
                    </div>
                    
                    <div style="padding: 20px; background: #f9f9f9;">
                        <h2 style="color: #1E88E5; border-bottom: 2px solid #1E88E5; padding-bottom: 10px;">New Contact Message</h2>
                        
                        <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0;">
                            <p><strong>Name:</strong> ${name}</p>
                            <p><strong>Email:</strong> ${email}</p>
                            <p><strong>Message Type:</strong> ${messageTypeStr}</p>
                        </div>
                        
                        <h3 style="color: #1E88E5;">Message:</h3>
                        <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #1E88E5;">
                            <p style="line-height: 1.6; margin: 0;">${message}</p>
                        </div>
                        
                        <div style="margin-top: 20px; padding: 10px; background: #e3f2fd; border-radius: 8px;">
                            <p style="margin: 0; font-size: 12px; color: #666;">
                                This message was sent on ${new Date().toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        // Auto-reply email to user
        const autoReplyOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Thank you for contacting YesCity!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #1E88E5, #42A5F5); padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Thank You, ${name}!</h1>
                    </div>
                    
                    <div style="padding: 20px; background: #f9f9f9;">
                        <p>Hi ${name},</p>
                        
                        <p>Thank you for reaching out to YesCity! We have received your message regarding: <strong>${messageTypeStr}</strong></p>
                        
                        <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #1E88E5; margin: 15px 0;">
                            <h4 style="margin-top: 0; color: #1E88E5;">Your Message:</h4>
                            <p style="line-height: 1.6; margin-bottom: 0;">${message}</p>
                        </div>
                        
                        <p>Our team will review your message and get back to you within 24-48 hours.</p>
                        
                        <div style="text-align: center; margin: 20px 0;">
                            <a href="https://yescity.in" style="background: #1E88E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                                Visit YesCity
                            </a>
                        </div>
                        
                        <p style="font-size: 14px; color: #666;">
                            Best regards,<br>
                            The YesCity Team
                        </p>
                    </div>
                </div>
            `
        };

        // Send both emails
        await transporter.sendMail(mailToYou);
        await transporter.sendMail(autoReplyOptions);

        return Response.json(
            { success: true, message: 'Email sent successfully!' },
            { status: 200 }
        );

    } catch (error) {
        return Response.json(
            { 
                success: false, 
                message: 'Failed to send email. Please try again.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
}