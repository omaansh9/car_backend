const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Car name is required'],
    trim: true
  },
  brand: {
    type: String,
    required: [true, 'Car brand is required'],
    trim: true
  },
  model: {
    type: String,
    required: [true, 'Car model is required'],
    trim: true
  },
  pricePerDay: {
    type: Number,
    required: [true, 'Price per day is required'],
    min: [0, 'Price per day cannot be negative']
  },
  image: {
    type: String,
    required: [true, 'Car image is required'],
    trim: true
  },
  images: {
    type: [String],
    default: []
  },
  fuelType: {
    type: String,
    trim: true,
    default: 'Petrol'
  },
  transmission: {
    type: String,
    trim: true,
    default: 'Automatic'
  },
  seats: {
    type: Number,
    default: 4,
    min: [1, 'Seats must be at least 1']
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 4.5
  },
  reviews: {
    type: Number,
    default: 0,
    min: [0, 'Reviews cannot be negative']
  },
  location: {
    type: String,
    trim: true,
    default: ''
  },
  year: {
    type: Number,
    min: [1900, 'Year must be valid']
  },
  mileage: {
    type: String,
    trim: true,
    default: ''
  },
  engine: {
    type: String,
    trim: true,
    default: ''
  },
  features: {
    type: [String],
    default: []
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  insurance: {
    type: String,
    trim: true,
    default: ''
  },
  cancellation: {
    type: String,
    trim: true,
    default: ''
  },
  availability: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Car', carSchema);