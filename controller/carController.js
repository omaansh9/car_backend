const Car = require('../models/Car');

// Get all cars
const getAllCars = async (req, res) => {
  try {
    const cars = await Car.find();
    res.status(200).json({
      success: true,
      count: cars.length,
      data: cars
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cars',
      error: error.message
    });
  }
};

// Get single car
const getCar = async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    res.status(200).json({
      success: true,
      data: car
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching car',
      error: error.message
    });
  }
};

// Add new car
const addCar = async (req, res) => {
  try {
    const {
      name,
      brand,
      model,
      pricePerDay,
      image,
      images,
      availability,
      fuelType,
      transmission,
      seats,
      rating,
      reviews,
      location,
      year,
      mileage,
      engine,
      features,
      description,
      insurance,
      cancellation
    } = req.body;

    // Validation
    if (!name || !brand || !model || !pricePerDay || !image) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, brand, model, pricePerDay, image'
      });
    }

    const car = await Car.create({
      name,
      brand,
      model,
      pricePerDay,
      image,
      images: Array.isArray(images) && images.length ? images : [image],
      availability: availability !== undefined ? availability : true,
      fuelType,
      transmission,
      seats,
      rating,
      reviews,
      location,
      year,
      mileage,
      engine,
      features: Array.isArray(features) ? features : features ? [features] : [],
      description,
      insurance,
      cancellation
    });

    res.status(201).json({
      success: true,
      message: 'Car added successfully',
      data: car
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding car',
      error: error.message
    });
  }
};

// Update car
const updateCar = async (req, res) => {
  try {
    const {
      name,
      brand,
      model,
      pricePerDay,
      image,
      images,
      availability,
      fuelType,
      transmission,
      seats,
      rating,
      reviews,
      location,
      year,
      mileage,
      engine,
      features,
      description,
      insurance,
      cancellation
    } = req.body;

    const car = await Car.findByIdAndUpdate(
      req.params.id,
      {
        name,
        brand,
        model,
        pricePerDay,
        image,
        images: Array.isArray(images) && images.length ? images : image ? [image] : undefined,
        availability,
        fuelType,
        transmission,
        seats,
        rating,
        reviews,
        location,
        year,
        mileage,
        engine,
        features: Array.isArray(features) ? features : features ? [features] : undefined,
        description,
        insurance,
        cancellation
      },
      {
        new: true,
        runValidators: true,
        omitUndefined: true
      }
    );

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Car updated successfully',
      data: car
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating car',
      error: error.message
    });
  }
};

// Delete car
const deleteCar = async (req, res) => {
  try {
    const car = await Car.findByIdAndDelete(req.params.id);

    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Car deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting car',
      error: error.message
    });
  }
};

module.exports = {
  getAllCars,
  getCar,
  addCar,
  updateCar,
  deleteCar
};