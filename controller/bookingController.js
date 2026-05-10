const Booking = require('../models/Booking');
const sendMail = require("../utils/sendMail");
const Car = require('../models/Car');
const {
  bookingCreatedEmail,
  cancellationEmail,
  refundEmail
} = require("../utils/emailTemplates");

const syncPaidBookingStatuses = () =>
  Booking.updateMany(
    { paymentStatus: 'paid', status: 'pending' },
    { $set: { status: 'active' } }
  );

// Get all bookings (admin only)
const getAllBookings = async (req, res) => {
  try {
    await syncPaidBookingStatuses();

    const bookings = await Booking.find()
      .populate('userId', 'name email')
      .populate('carId', 'name brand model pricePerDay image')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message
    });
  }
};

// Get user's bookings
const getUserBookings = async (req, res) => {
  try {
    await syncPaidBookingStatuses();

    const bookings = await Booking.find({ userId: req.user.userId })
      .populate('carId', 'name brand model pricePerDay image')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user bookings',
      error: error.message
    });
  }
};

// Create booking
const createBooking = async (req, res) => {
  try {
    const { carId, startDate, endDate } = req.body;
    const userId = req.user.userId;

    // Validation
    if (!carId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide carId, startDate, and endDate'
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    if (start < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be in the past'
      });
    }

    // Check if car exists and is available
    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    if (!car.availability) {
      return res.status(400).json({
        success: false,
        message: 'Car is not available for booking'
      });
    }

    // Check for booking conflicts
    const conflictingBooking = await Booking.findOne({
      carId,
      status: { $in: ['pending', 'active'] },
      $or: [
        {
          $and: [
            { startDate: { $lte: end } },
            { endDate: { $gte: start } }
          ]
        }
      ]
    });

    if (conflictingBooking) {
      return res.status(409).json({
        success: false,
        message: 'Car already booked for selected dates'
      });
    }

    // Calculate total price
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const totalPrice = days * car.pricePerDay;

    // Create booking
    const booking = await Booking.create({
      userId,
      carId,
      startDate: start,
      endDate: end,
      totalPrice
    });

    // Populate booking data
    await booking.populate('carId', 'name brand model pricePerDay image');
    await sendMail(
      req.user.email,
      'LuxeDrive booking request received',
      bookingCreatedEmail({
        user: req.user,
        booking,
        car
      })
    );
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: error.message
    });
  }
};

// Cancel booking
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user.userId,
      status: { $in: ['pending', 'active'] }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or already cancelled'
      });
    }

    // Check if booking can be cancelled (not starting within 24 hours)
    const now = new Date();
    const bookingStart = new Date(booking.startDate);
    const hoursUntilStart = (bookingStart - now) / (1000 * 60 * 60);

    if (hoursUntilStart < 24) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel booking less than 24 hours before start time'
      });
    }

    const wasPaid = booking.paymentStatus === 'paid';
    await booking.populate('carId', 'name brand model pricePerDay image');

    booking.status = 'cancelled';
    if (wasPaid) {
      booking.paymentStatus = 'refunded';
    }
    await booking.save();

    await sendMail(
      req.user.email,
      'LuxeDrive booking cancellation confirmed',
      cancellationEmail({
        user: req.user,
        booking,
        car: booking.carId
      })
    );

    if (wasPaid) {
      await sendMail(
        req.user.email,
        'LuxeDrive refund processing notification',
        refundEmail({
          user: req.user,
          booking,
          car: booking.carId,
          status: 'processing'
        })
      );
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: error.message
    });
  }
};

// Get single booking
const getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('carId', 'name brand model pricePerDay image');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns this booking or is admin
    if (booking.userId._id.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching booking',
      error: error.message
    });
  }
};

module.exports = {
  getAllBookings,
  getUserBookings,
  createBooking,
  cancelBooking,
  getBooking
};
