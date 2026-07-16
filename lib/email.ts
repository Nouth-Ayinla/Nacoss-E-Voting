const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "elections@yourdomain.com";
const SENDER_NAME = process.env.BREVO_SENDER_NAME || "NACOSS Elections";

async function sendEmail(to: string, subject: string, htmlContent: string) {
  if (!BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not defined in environment variables.");
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: to }],
      subject: subject,
      htmlContent: htmlContent,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(`Brevo API Error: ${JSON.stringify(errorData)}`);
  }
}

/**
 * Notifies the student that their registration has been received
 * and is currently undergoing admin review.
 */
export async function sendRegistrationReceivedEmail(to: string, name: string) {
  const htmlContent = `
    <p>Hello ${name},</p>
    <p>We have received your voter registration for the NACOSS Elections.</p>
    <p>Our administrators are currently verifying your student credentials and uploaded ID card. You will receive another email as soon as your account has been reviewed.</p>
    <p>Thank you,</p>
    <p>NACOSS Electoral Committee</p>
  `;
  await sendEmail(to, "NACOSS Voter Registration Received", htmlContent);
}

/**
 * Notifies the student of the admin's decision.
 * If approved, includes their unique secure Voting PIN.
 */
export async function sendVerificationResultEmail(
  to: string,
  status: "verified" | "rejected",
  pinOrReason?: string
) {
  const subject =
    status === "verified" ? "Voter Registration Approved" : "Voter Registration Rejected";
  
  const htmlContent =
    status === "verified"
      ? `
        <p>Congratulations,</p>
        <p>Your voter registration has been approved! You are eligible to vote in the upcoming NACOSS Elections.</p>
        <p>Your unique secure Voting PIN is: <strong style="font-size: 18px; letter-spacing: 0.1em; color: #16a34a;">${pinOrReason}</strong></p>
        <p>Please keep this PIN safe. You will need it, along with your Matric Number, to cast your ballot once the election is ongoing.</p>
        <p>Do not share this PIN with anyone.</p>
        <p>Thank you,</p>
        <p>NACOSS Electoral Committee</p>
      `
      : `
        <p>Hello,</p>
        <p>Your voter registration was rejected.</p>
        <p><strong>Reason for rejection:</strong> ${pinOrReason ?? "Not specified."}</p>
        <p>Please re-register at the portal with your correct credentials and a clear photo of your student ID card.</p>
        <p>Thank you,</p>
        <p>NACOSS Electoral Committee</p>
      `;

  await sendEmail(to, subject, htmlContent);
}
