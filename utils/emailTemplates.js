const formatCurrency = amount =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(Number(amount || 0));

const formatDate = value =>
  new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(value));

const layout = ({ title, subtitle, greeting, body, details = [], closing = 'Warm regards' }) => `
  <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6; max-width: 680px; margin: 0 auto;">
    <div style="border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
      <h2 style="margin: 0; color: #111827;">${title}</h2>
      ${subtitle ? `<p style="margin: 6px 0 0; color: #4b5563;">${subtitle}</p>` : ''}
    </div>

    <p>${greeting}</p>
    ${body.map(paragraph => `<p>${paragraph}</p>`).join('')}

    ${details.length ? `
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0; font-size: 14px;">
        <tbody>
          ${details.map(([label, value]) => `
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; width: 38%;">${label}</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${value}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}

    <p style="margin-top: 28px;">
      ${closing},<br />
      <strong>LuxeDrive Reservations Team</strong><br />
      LuxeDrive Car Rentals
    </p>
  </div>
`;

const welcomeEmail = user => layout({
  title: 'Welcome to LuxeDrive',
  subtitle: 'Your account has been created successfully',
  greeting: `Dear ${user.name || 'Customer'},`,
  body: [
    'Thank you for registering with LuxeDrive. Your account is now active and ready to use.',
    'You can browse our available vehicles, choose your preferred rental dates, and complete your booking securely through our payment gateway.',
    'We are delighted to have you with us and look forward to serving your travel needs.'
  ],
  details: [
    ['Registered Email', user.email],
    ['Account Type', user.role || 'user']
  ]
});

const bookingCreatedEmail = ({ user, booking, car }) => layout({
  title: 'Booking Request Received',
  subtitle: 'Your reservation has been created',
  greeting: `Dear ${user.name || 'Customer'},`,
  body: [
    'Thank you for choosing LuxeDrive. We have received your booking request and reserved the selected vehicle while payment is being completed.',
    'Once payment is confirmed, you will receive a formal payment confirmation email with your PDF invoice attached.'
  ],
  details: [
    ['Booking ID', booking._id],
    ['Vehicle', `${car.brand || ''} ${car.model || ''} (${car.name || 'Vehicle'})`],
    ['Pickup Date', formatDate(booking.startDate)],
    ['Return Date', formatDate(booking.endDate)],
    ['Total Amount', formatCurrency(booking.totalPrice)],
    ['Booking Status', booking.status],
    ['Payment Status', booking.paymentStatus]
  ]
});

const cancellationEmail = ({ user, booking, car }) => layout({
  title: 'Booking Cancellation Confirmed',
  subtitle: 'Your reservation has been cancelled',
  greeting: `Dear ${user.name || 'Customer'},`,
  body: [
    'We confirm that your LuxeDrive booking has been cancelled successfully.',
    booking.paymentStatus === 'paid'
      ? 'Because this booking was paid, your refund request has been initiated. Refunds are processed back to the original payment method, subject to bank and payment gateway timelines.'
      : 'No payment was captured for this booking, so no refund action is required.',
    'Please keep the details below for your records.'
  ],
  details: [
    ['Booking ID', booking._id],
    ['Vehicle', `${car.brand || ''} ${car.model || ''} (${car.name || 'Vehicle'})`],
    ['Pickup Date', formatDate(booking.startDate)],
    ['Return Date', formatDate(booking.endDate)],
    ['Total Amount', formatCurrency(booking.totalPrice)],
    ['Booking Status', booking.status],
    ['Payment Status', booking.paymentStatus]
  ]
});

const refundEmail = ({ user, booking, car, status = 'processing' }) => layout({
  title: status === 'completed' ? 'Refund Confirmation' : 'Refund Processing Notification',
  subtitle: status === 'completed' ? 'Your refund has been confirmed' : 'Your refund has been initiated',
  greeting: `Dear ${user.name || 'Customer'},`,
  body: [
    status === 'completed'
      ? 'This email confirms that your refund for the cancelled LuxeDrive booking has been processed.'
      : 'This email confirms that we have initiated a refund for your cancelled LuxeDrive booking.',
    'The refund will be credited to your original payment method. The final posting time may vary depending on your bank or card issuer.',
    'If the refund does not appear within the expected banking timeline, please contact our support team with your booking and payment reference.'
  ],
  details: [
    ['Booking ID', booking._id],
    ['Payment ID', booking.stripePaymentIntentId || 'Not available'],
    ['Vehicle', `${car.brand || ''} ${car.model || ''} (${car.name || 'Vehicle'})`],
    ['Refund Amount', formatCurrency(booking.totalPrice)],
    ['Refund Status', status === 'completed' ? 'Refunded' : 'Processing']
  ],
  closing: 'Sincerely'
});

const paymentFailedEmail = ({ user, booking, car }) => layout({
  title: 'Payment Could Not Be Completed',
  subtitle: 'Your booking was not confirmed',
  greeting: `Dear ${user.name || 'Customer'},`,
  body: [
    'We were unable to complete payment for your LuxeDrive booking.',
    'As payment was not successful, the booking has not been confirmed. You may try booking again with a valid payment method.'
  ],
  details: [
    ['Booking ID', booking._id],
    ['Vehicle', `${car.brand || ''} ${car.model || ''} (${car.name || 'Vehicle'})`],
    ['Amount', formatCurrency(booking.totalPrice)],
    ['Payment Status', booking.paymentStatus],
    ['Booking Status', booking.status]
  ]
});

module.exports = {
  bookingCreatedEmail,
  cancellationEmail,
  refundEmail,
  paymentFailedEmail,
  welcomeEmail
};
