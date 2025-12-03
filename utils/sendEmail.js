import nodemailer from "nodemailer";

export default async function sendEmail(to, subject, text, html) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"TraineeMind" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html: html || `<p>${text}</p>`,
  };

  await transporter.sendMail(mailOptions);
}
