const stripe = process.env.STRIPE_SECRET_KEY
  ? require("stripe")(process.env.STRIPE_SECRET_KEY)
  : null;

const Booking = require("../models/Booking");
const Car = require("../models/Car");
const sendMail = require("../utils/sendMail");
const buildInvoicePdf = require("../utils/invoicePdf");
const {
  paymentFailedEmail,
  refundEmail
} = require("../utils/emailTemplates");

const formatCurrency = amount =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);

const formatDate = date =>
  new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));

const buildInvoiceHtml = booking => {
  const car = booking.carId;
  const user = booking.userId;
  const start = new Date(booking.startDate);
  const end = new Date(booking.endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const paidDate = formatDate(booking.paidAt || booking.createdAt || new Date());

  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6; max-width: 680px; margin: 0 auto;">
      <div style="border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
        <h2 style="margin: 0; color: #111827;">LuxeDrive Booking Confirmation</h2>
        <p style="margin: 6px 0 0; color: #4b5563;">Payment receipt and invoice</p>
      </div>

      <p>Dear ${user.name || "Customer"},</p>

      <p>
        Thank you for choosing LuxeDrive. We are pleased to confirm that your payment has been received
        successfully and your car rental booking is now confirmed.
      </p>

      <p>
        Please find your formal invoice attached as a PDF. A summary of your booking and payment details is
        included below for your reference.
      </p>

      <table style="border-collapse: collapse; width: 100%; margin: 20px 0; font-size: 14px;">
        <tbody>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Invoice ID</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${booking._id}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Payment ID</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${booking.stripePaymentIntentId}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Payment Date</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${paidDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Vehicle</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${car.brand} ${car.model} (${car.name})</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Rental Period</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${formatDate(booking.startDate)} to ${formatDate(booking.endDate)}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Duration</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${days} day${days === 1 ? "" : "s"}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Total Paid</td>
            <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; color: #2563eb;">${formatCurrency(booking.totalPrice)}</td>
          </tr>
        </tbody>
      </table>

      <p>
        If you have any questions about your booking or payment, please reply to this email and our support
        team will be happy to assist you.
      </p>

      <p style="margin-top: 28px;">
        Warm regards,<br />
        <strong>LuxeDrive Reservations Team</strong><br />
        LuxeDrive Car Rentals
      </p>
    </div>
  `;
};

const sendBookingInvoice = async bookingId => {
  const booking = await Booking.findById(bookingId)
    .populate("userId", "name email")
    .populate("carId", "name brand model pricePerDay");

  if (!booking || !booking.userId?.email || booking.invoiceEmailSentAt) {
    return;
  }

  const html = buildInvoiceHtml(booking);
  const invoicePdf = buildInvoicePdf(booking);

  const info = await sendMail(
    booking.userId.email,
    `LuxeDrive invoice for booking ${booking._id}`,
    html,
    [
      {
        filename: `invoice-${booking._id}.pdf`,
        content: invoicePdf,
        contentType: "application/pdf",
      },
    ]
  );

  if (!info) {
    return;
  }

  booking.invoiceEmailSentAt = new Date();
  await booking.save();
};


// ======================================================
// CREATE PAYMENT INTENT
// ======================================================
const createPaymentIntent = async (req, res) => {

  try {

    if (!stripe) {
      return res.status(500).json({
        success: false,
        message: "Stripe is not configured",
      });
    }

    const { carId, startDate, endDate } = req.body;

    const userId = req.user.userId;


    // ======================================================
    // VALIDATION
    // ======================================================
    if (!carId || !startDate || !endDate) {

      return res.status(400).json({
        success: false,
        message: "Please provide carId, startDate, and endDate",
      });
    }


    // ======================================================
    // DATE VALIDATION
    // ======================================================
    const start = new Date(startDate);

    const end = new Date(endDate);

    if (start >= end) {

      return res.status(400).json({
        success: false,
        message: "End date must be after start date",
      });
    }

    if (start < new Date()) {

      return res.status(400).json({
        success: false,
        message: "Start date cannot be in the past",
      });
    }


    // ======================================================
    // FIND CAR
    // ======================================================
    const car = await Car.findById(carId);

    if (!car) {

      return res.status(404).json({
        success: false,
        message: "Car not found",
      });
    }


    // ======================================================
    // CHECK AVAILABILITY
    // ======================================================
    if (!car.availability) {

      return res.status(400).json({
        success: false,
        message: "Car is not available",
      });
    }


    // ======================================================
    // CHECK BOOKING CONFLICTS
    // ======================================================
    const conflictingBooking = await Booking.findOne({
      carId,
      status: { $in: ["pending", "active"] },

      $or: [
        {
          startDate: { $lte: end },
          endDate: { $gte: start },
        },
      ],
    });


    if (conflictingBooking) {

      return res.status(409).json({
        success: false,
        message: "Car already booked for selected dates",
      });
    }


    // ======================================================
    // CALCULATE PRICE
    // ======================================================
    const days = Math.ceil(
      (end - start) / (1000 * 60 * 60 * 24)
    );

    const totalPrice = days * car.pricePerDay;


    // ======================================================
    // CREATE STRIPE PAYMENT INTENT
    // ======================================================
    const paymentIntent = await stripe.paymentIntents.create({

      amount: Math.round(totalPrice * 100),

      currency: "inr",

      metadata: {
        carId: carId.toString(),
        userId: userId.toString(),
        startDate,
        endDate,
        days: days.toString(),
      },

      description: `Car Rental - ${car.name}`,

      automatic_payment_methods: {
        enabled: true,
      },
    });


    // ======================================================
    // CREATE PENDING BOOKING
    // ======================================================
    const booking = await Booking.create({

      userId,

      carId,

      startDate: start,

      endDate: end,

      totalPrice,

      stripePaymentIntentId: paymentIntent.id,

      paymentStatus: "pending",

      status: "pending",
    });


    // ======================================================
    // RESPONSE
    // ======================================================
    return res.status(200).json({

      success: true,

      message: "Payment intent created successfully",

      data: {

        bookingId: booking._id,

        paymentIntentId: paymentIntent.id,

        clientSecret: paymentIntent.client_secret,

        totalPrice,

        days,

        car: {

          name: car.name,

          brand: car.brand,

          model: car.model,

          pricePerDay: car.pricePerDay,

          image: car.image,
        },
      },
    });

  } catch (error) {

    console.log("Create Payment Intent Error:", error);

    return res.status(500).json({
      success: false,
      message: "Error creating payment intent",
      error: error.message,
    });
  }
};



// ======================================================
// CONFIRM PAYMENT
// ======================================================
const confirmPayment = async (req, res) => {

  try {

    if (!stripe) {

      return res.status(500).json({
        success: false,
        message: "Stripe is not configured",
      });
    }

    const { paymentIntentId } = req.body;


    // ======================================================
    // FIND BOOKING
    // ======================================================
    const booking = await Booking.findOne({
      stripePaymentIntentId: paymentIntentId,
    });

    if (!booking) {

      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }


    // ======================================================
    // VERIFY PAYMENT
    // ======================================================
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId
    );


    if (paymentIntent.status === "succeeded") {

      booking.status = "active";

      booking.paymentStatus = "paid";

      booking.paidAt = booking.paidAt || new Date();

      booking.stripeChargeId = paymentIntent.latest_charge || booking.stripeChargeId;

      await booking.save();

      await booking.populate(
        "carId",
        "name brand model image pricePerDay"
      );

      await sendBookingInvoice(booking._id);


      return res.status(200).json({

        success: true,

        message: "Payment confirmed successfully",

        data: booking,
      });

    } else {

      booking.status = "cancelled";

      booking.paymentStatus = "failed";

      await booking.save();


      return res.status(400).json({

        success: false,

        message: "Payment not completed",
      });
    }

  } catch (error) {

    console.log("Confirm Payment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Error confirming payment",
      error: error.message,
    });
  }
};



// ======================================================
// HANDLE WEBHOOK
// ======================================================
const handleWebhook = async (req, res) => {

  try {

    if (!stripe) {

      return res.status(500).json({
        success: false,
        message: "Stripe is not configured",
      });
    }

    const sig = req.headers["stripe-signature"];

    let event;


    // ======================================================
    // VERIFY WEBHOOK SIGNATURE
    // ======================================================
    try {

      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

    } catch (err) {

      console.log(
        "Webhook Signature Verification Failed:",
        err.message
      );

      return res.status(400).send(
        `Webhook Error: ${err.message}`
      );
    }


    console.log("==================================");
    console.log("STRIPE EVENT:", event.type);
    console.log("==================================");


    // ======================================================
    // HANDLE EVENTS
    // ======================================================
    switch (event.type) {

      case "payment_intent.created":
        console.log("Payment Intent Created");
        break;


      case "payment_intent.succeeded":

        console.log("Payment Successful");

        await handlePaymentSuccess(
          event.data.object
        );

        break;


      case "payment_intent.payment_failed":

        console.log("Payment Failed");

        await handlePaymentFailure(
          event.data.object.id
        );

        break;


      case "charge.succeeded":
        console.log("Charge Successful");
        break;


      case "charge.updated":
        console.log("Charge Updated");
        break;


      case "charge.refunded":
        console.log("Charge Refunded");
        await handleRefundEvent(event.data.object.payment_intent);
        break;


      case "refund.created":
        console.log("Refund Created");
        await handleRefundEvent(event.data.object.payment_intent);
        break;


      case "refund.updated":
        console.log("Refund Updated");
        break;


      default:
        console.log(`Unhandled Event Type: ${event.type}`);
    }


    return res.status(200).json({
      received: true,
    });

  } catch (error) {

    console.log("Webhook Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// ======================================================
// HANDLE SUCCESSFUL PAYMENT
// ======================================================
const handlePaymentSuccess = async (paymentIntent) => {

  try {
    const paymentIntentId = typeof paymentIntent === "string"
      ? paymentIntent
      : paymentIntent.id;

    const booking = await Booking.findOne({
      stripePaymentIntentId: paymentIntentId,
    });

    if (!booking) {

      console.log("Booking not found");

      return;
    }

    booking.status = "active";

    booking.paymentStatus = "paid";

    booking.paidAt = booking.paidAt || new Date();

    booking.stripeChargeId = booking.stripeChargeId ||
      (typeof paymentIntent === "object" ? paymentIntent.latest_charge : undefined);

    await booking.save();

    await sendBookingInvoice(booking._id);

    console.log(
      `Booking ${booking._id} activated successfully`
    );

  } catch (error) {

    console.log(
      "Handle Payment Success Error:",
      error
    );
  }
};



// ======================================================
// HANDLE FAILED PAYMENT
// ======================================================
const handlePaymentFailure = async (paymentIntentId) => {

  try {

    const booking = await Booking.findOne({
      stripePaymentIntentId: paymentIntentId,
    });

    if (!booking) {

      console.log("Booking not found");

      return;
    }

    booking.status = "cancelled";

    booking.paymentStatus = "failed";

    await booking.save();

    await booking.populate("userId", "name email");
    await booking.populate("carId", "name brand model pricePerDay");

    if (booking.userId?.email) {
      await sendMail(
        booking.userId.email,
        "LuxeDrive payment could not be completed",
        paymentFailedEmail({
          user: booking.userId,
          booking,
          car: booking.carId
        })
      );
    }

    console.log(
      `Booking ${booking._id} cancelled`
    );

  } catch (error) {

    console.log(
      "Handle Payment Failure Error:",
      error
    );
  }
};



// ======================================================
// EXPORTS
// ======================================================
module.exports = {
  createPaymentIntent,
  confirmPayment,
  handleWebhook,
};

// ======================================================
// HANDLE REFUND
// ======================================================
const handleRefundEvent = async (paymentIntentId) => {

  try {

    if (!paymentIntentId) {
      return;
    }

    const booking = await Booking.findOne({
      stripePaymentIntentId: paymentIntentId,
    })
      .populate("userId", "name email")
      .populate("carId", "name brand model pricePerDay");

    if (!booking) {
      console.log("Refund booking not found");
      return;
    }

    booking.status = "cancelled";
    booking.paymentStatus = "refunded";
    await booking.save();

    if (booking.userId?.email) {
      await sendMail(
        booking.userId.email,
        "LuxeDrive refund confirmation",
        refundEmail({
          user: booking.userId,
          booking,
          car: booking.carId,
          status: "completed"
        })
      );
    }

  } catch (error) {

    console.log(
      "Handle Refund Error:",
      error
    );
  }
};
