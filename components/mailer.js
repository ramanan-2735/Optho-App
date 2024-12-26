import nodemailer from 'nodemailer';

// Configure the transporter
const transporter = nodemailer.createTransport({
    
    service: 'gmail', // Use your email provider
    auth: {
        user: "sirisaacn310@gmail.com", // Use environment variables for security
        pass: "zpeb wddw ujuz wrst",
    },
});

// Function to send email
export const sendEmail = async (recipient, subject, content) => {
    const mailOptions = {
        from: process.env.EMAIL,
        to: recipient,
        subject: subject,
        html: content,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ', info.response);
        return { success: true, message: 'Email sent successfully' };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, message: error.message };
    }
};
