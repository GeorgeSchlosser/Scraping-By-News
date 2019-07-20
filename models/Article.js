const mongoose = require("mongoose");

// Save Reference to Schema Constructor
const Schema = mongoose.Schema;

// Create ArticleSchema w/ Schema constructor
var ArticleSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  saved: {
    type: Boolean,
    default: false

  },
  
  // `notes` is an array that stores a Note id
  notes:[ {
    type: Schema.Types.ObjectId,
    // The ref property links the ObjectId to the Note model allowing us to populate the Article with an associated Note
    ref: "Note"
  }]
});

// Creates our Model from the above schema w/ mongoose's model method
const Article = mongoose.model("Article", ArticleSchema);

// Export Article model
module.exports = Article;