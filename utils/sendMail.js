import sgMail from "@sendgrid/mail";
import apiResponse from "./apiResponse.js";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (email, data, res) => {
  const message = {
    to: email,
    from: "sadibwrites9@gmail.com",
    subject: data.subject,
    html: data.html,
  };

  try {
    await sgMail.send(message);
  } catch (error) {
    console.error("Error sending email:", error.response ? error.response.body : error);
    return apiResponse(false, "Failed to send email", null, 500, res);
  }
};

export default sendEmail;
