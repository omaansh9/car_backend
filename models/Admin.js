const mongoose = require("mongoose");


const adminSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true, 
        lowercase: true, 
        trim: true,
        validate: {
        validator: function (v) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: props => `${props.value} is not a valid email address`
        }
    },
    name:{
        type: String,
        required: true
    },
    password : { type: String, required: true },
    createdAt: {
    type: Date,
    default: Date.now
  }
});

const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;