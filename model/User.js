const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  Name: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  Position: { type: String},
});


module.exports =mongoose.model('User', userSchema);