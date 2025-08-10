// utils/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,          // e.g. smtp.hostinger.com
  port: Number(process.env.EMAIL_PORT),  // 465 or 587
  secure: Number(process.env.EMAIL_PORT) === 465, // true for 465, false otherwise
  auth: {
    user: process.env.EMAIL_USER,        // orders@theordnery.com
    pass: process.env.EMAIL_PASS,        // mailbox/app password
  },
});

// Optional: verify on boot (helps catch DNS/credentials issues)
export async function verifyMailer() {
  try {
    await transporter.verify();
    console.log("[MAILER] SMTP connection verified.");
  } catch (e) {
    console.error("[MAILER] SMTP verify failed:", e);
  }
}
export const sendEmail = async (to, orderDetails) => {
  const { orderId, items, totalPrice, trackingId, shippingAddress } = orderDetails;

  // Table rows for items (all inline styles)
  const itemRows = (items || []).map(item => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #eee;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td style="padding-right:12px;">
              <img src="${item.imageSrc}" alt="${item.name}" width="60" height="60" style="display:block;border-radius:4px;object-fit:cover;">
            </td>
            <td style="font:14px/20px Arial,sans-serif;color:#222;font-weight:600;">
              ${item.name}
            </td>
          </tr>
        </table>
      </td>
      <td align="center" style="padding:12px 0;border-bottom:1px solid #eee;font:14px Arial,sans-serif;color:#555;">
        ${item.quantity}
      </td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid #eee;font:14px Arial,sans-serif;color:#222;">
        PKR ${Number(item.price).toLocaleString()}
      </td>
    </tr>
  `).join("");

  const html = `
  <!doctype html>
  <html>
  <body style="margin:0;padding:0;background:#f6f7fb;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f7fb;">
      <tr>
        <td align="center" style="padding:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background:#ffffff;border:1px solid #e9e9ef;border-radius:8px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:24px;background:#ffffff;">
                <img src="https://theordnery.com/public/logo.png" alt="The Ordnery" width="180" style="display:block;height:auto;">
              </td>
            </tr>

            <tr>
              <td style="padding:0 28px 4px 28px;">
                <h2 style="margin:0 0 8px 0;font:700 22px/28px Arial,sans-serif;color:#111;">
                  Order Placed Successfully!
                </h2>
                <p style="margin:0 0 20px 0;font:14px/20px Arial,sans-serif;color:#555;">
                  Thank you for your purchase. Your order <strong>#${orderId}</strong> is now being processed.
                </p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:0 28px 24px 28px;">
                <a href="https://theordnery.com/track/${trackingId}"
                   style="display:inline-block;padding:12px 18px;background:#000;color:#fff;text-decoration:none;border-radius:6px;font:700 14px Arial,sans-serif;">
                  Track Order
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding:0 28px;">
                <h3 style="margin:0 0 10px 0;font:700 16px/22px Arial,sans-serif;color:#111;">Order Summary</h3>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                  <thead>
                    <tr>
                      <th align="left" style="padding:0 0 8px 0;border-bottom:2px solid #111;font:700 12px Arial,sans-serif;color:#111;text-transform:uppercase;letter-spacing:.5px;">Product</th>
                      <th align="center" style="padding:0 0 8px 0;border-bottom:2px solid #111;font:700 12px Arial,sans-serif;color:#111;text-transform:uppercase;letter-spacing:.5px;">Qty</th>
                      <th align="right" style="padding:0 0 8px 0;border-bottom:2px solid #111;font:700 12px Arial,sans-serif;color:#111;text-transform:uppercase;letter-spacing:.5px;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemRows}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="2" align="right" style="padding:16px 0 0 0;font:700 14px Arial,sans-serif;color:#111;">Total:</td>
                      <td align="right" style="padding:16px 0 0 0;font:700 14px Arial,sans-serif;color:#111;">PKR ${Number(totalPrice).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 28px 28px 28px;">
                <h3 style="margin:0 0 10px 0;font:700 16px/22px Arial,sans-serif;color:#111;">Shipping Address</h3>
                <div style="background:#f8f9fb;border:1px solid #e9e9ef;border-radius:6px;padding:12px;">
                  <p style="margin:0;font:14px/20px Arial,sans-serif;color:#444;">${shippingAddress}</p>
                </div>
              </td>
            </tr>

            <tr>
              <td align="center" style="background:#f1f3f8;padding:16px;font:12px Arial,sans-serif;color:#888;">
                © ${new Date().getFullYear()} The Ordnery. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;

  const mailOptions = {
    from: `"The Ordnery" <${process.env.EMAIL_USER}>`,
    to,
    replyTo: "support@theordnery.com",
    subject: `Your Order Confirmation - #${orderId}`,
    text: `Thanks for your purchase! Order #${orderId}. Track: https://theordnery.com/track/${trackingId}. Total: PKR ${totalPrice}. Ship to: ${shippingAddress}`, // plain-text fallback
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log("[MAILER] Sent:", info.messageId, "to:", to);
};
