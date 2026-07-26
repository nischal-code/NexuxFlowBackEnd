import nodemailer from "nodemailer"
import config from "../config/config.js"

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type:'OAuth2',
        user: config.GOOGLE_USER,
        clientId: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        refreshToken: config.GOOGLE_REFRESH_TOKEN
    }
})

transporter.verify((error, success) => {
    if (error) {
        console.error("Error while verifying email transporter:", error);
    } else {
        console.log("ready for send emails")
        console.log(success)
    }
})

const sendEmail = async (to, subject, text, html) => {
    try {
        const info = await transporter.sendMail({
            from: config.GOOGLE_USER,
            to,
            subject,
            text,
            html
        });
        console.log("Email sent successfully to:", to);
        console.log("preview URL:", nodemailer.getTestMessageUrl(info));
    }
    catch (error) {
        console.error("Error while sending email:", error);
    }
}

export default sendEmail