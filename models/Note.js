const mongoose = require("mongoose");

// Refer Schema constructor
const Schema = mongoose.Schema;

// Create NoteSchema w/ Schema constructor
var NoteSchema = new Schema({
  title: String,
});

// Creates our Model from the above schema w/ mongoose's model method
const Note = mongoose.model("Note", NoteSchema);
// Export Note model
module.exports = Note;