const express = require('express');
const router = express.Router();
const paymentController = require('../../controller/paymentController');
const auth = require('../../middleware/auth');

/**
 * @swagger
 * /api/payments/create-payment-intent:
 *   post:
 *     summary: Create payment intent for booking
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - carId
 *               - startDate
 *               - endDate
 *             properties:
 *               carId:
 *                 type: string
 *                 description: ID of the car to book
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Booking start date (YYYY-MM-DD)
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Booking end date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Payment intent created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Car already booked
 *       500:
 *         description: Server error
 */
router.post('/create-payment-intent', auth, paymentController.createPaymentIntent);

/**
 * @swagger
 * /api/payments/confirm-payment:
 *   post:
 *     summary: Confirm payment and activate booking
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *                 description: Stripe payment intent ID
 *     responses:
 *       200:
 *         description: Payment confirmed and booking activated
 *       400:
 *         description: Payment failed
 *       404:
 *         description: Booking not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/confirm-payment', auth, paymentController.confirmPayment);

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Handle Stripe webhook events
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Webhook signature verification failed
 */
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

module.exports = router;