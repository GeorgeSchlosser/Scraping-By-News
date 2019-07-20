// Dependencies
const express = require("express"),
    logger = require("morgan"),
    mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
const axios = require("axios"),
    cheerio = require("cheerio");

// Require all models
const db = require("./models");

// Set Heroku-ready port
const PORT = process.env.PORT || 3000;

// Initialize Express
const app = express();

// Middleware Config
// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Handlebars Config
const exphbs = require("express-handlebars");
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

// MongoDB Connection 
var MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/scrapingNews';
mongoose.connect(MONGODB_URI, { useNewUrlParser: true }).then(() => {
	app.listen(PORT, err => {
		if (err) { throw err; }
		console.log(`Server listening on port ${PORT}`);
	});
}, err => {
	console.log(`Mongoose connect error: ${err}`);
});

// ROUTES

// Route to get all Articles from db
app.get("/", function(req, res) {
    // Grab all documents from Articles collection
    db.Article.find({saved:false})
      .then(function(dbArticle) {

        //  If Articls db empty
        if(dbArticle.length===0)
      {
        res.render("index");
      }
      else{
        let hbsObject={
          data:dbArticle,
          isArticle:true,
          isSaved:false

        }
        // If Articles are present, send to client
        res.render("index",hbsObject);
        }
    })
    .catch(function(err) {
      // If error, send to client
      res.json(err);
    });
});

// GET Route for scraping website
app.get("/scrape", function(req, res) {
    // First, we grab the body of the html with axios
    axios.get("https://www.nytimes.com/section/arts").then(function(response) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        const $ = cheerio.load(response.data);

        // Now, we grab every a within an li tag, and do the following:
        $("li a").each(function(i, element) {

            // Save an empty result object
            let result = {};

            // Add the text and href of every link, and save them as properties of the result object
            result.title = $(this)
                .children("h2")
                .text();
            result.link = $(this)
                .attr("href");
            result.summary = $(this)
                .children("p")
                .text();
            // Create a new Article using the `result` object built from scraping
            db.Article.create(result)
                .then(function(dbArticle) {
                // View the added result in the console
                console.log(dbArticle);
                res.redirect("/");
            })
            .catch(function(err) {
            // If an error occurred, log it
            console.log("Error");
            });
      
        })

        // Send a message to the client
        let hbsObject={
            scraped:true
        }

    }).catch(function(err) {
        // If an error occurred, log it
        console.log("Error");
    });
});

// Rout to clear
app.get("/clear", function(req, res) {
  db.Article.remove({}, function (err, doc) {
    if (err) {
      console.log(err);
    } else {
      console.log('all articles removed');
    }
  });
});

// Route to get saved articles from db
app.get("/saved", function(req, res) {
    // grab every document in Articles collection
    db.Article.find({saved:true})
    .then(function(dbArticle) {
        // if no Articles in db
        if (dbArticle.length === 0)
        {
            res.render("index");
        }
        else {
            let hbsObject={
                data:dbArticle,
                isArticle:true,
                isSaved:true
            }
        // If Articles are found send to client
        res.render("savedArticles",hbsObject);
        }
    })
    // If there's an error send to client
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route to grab specific Articles by id & populate w/ its id
app.get("/articles/:id", function(req, res) {
    // using the id passed as a parameter start a query to match to the id in our db
    db.Article.findOne({ _id: req.params.id })
    // populate w/ associated notes
    .populate("notes")
    .then(function(dbArticle) {
        // if the Article is found send to client
        res.json(dbArticle);
    })
    .catch(function(err) {
        // if there's an error send to client
    res.json(err);
    });
});  

// Route to save/update Article's Notes
app.post("/articles/:id", function(req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note.create(req.body)
        .then(function(dbNote) {
        // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
        // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
        // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query 
        return db.Article.findOneAndUpdate({ _id: req.params.id },{$push: { notes: dbNote._id }}, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for deleting/updating Article's Note
app.post("/deletenote/:id/:noteid", function(req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note.findByIdAndDelete(req.params.noteid)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id },{$pull: { notes: dbNote._id }}, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Mark Article as Saved
app.put("/save/:id", function (req, res) {

    db.Article.findOneAndUpdate({ _id: req.params.id }, { "saved": true }, { new: true })

        .then(function (dbArticle) {
            // View updated result console
            console.log(dbArticle);
            res.send("Successfully saved");
        })
        .catch(function (err) {
            // Log error if existent
            console.log(err);
            res.send("Error occurred saving article");
        });
});

// Delete Article
app.delete("/delete/:id", function (req, res) {

    db.Article.findOneAndUpdate({ _id: req.params.id }, { "saved": false }, { new: true })

    .then(function (dbArticle) {
    })
    .catch(function (err) {
      // Log error if existent
      console.log(err);
      res.send("Error deleting article");
    });

});

// Start Server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});