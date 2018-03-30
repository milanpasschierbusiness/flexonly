var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var LinkedInStrategy = require('passport-linkedin').Strategy;
var NodeGeocoder = require('node-geocoder');
var randomstring = require("randomstring");
var multer  = require('multer');
var path = require('path');
var request = require('request');
var cheerio = require('cheerio');

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)) //Appending extension
  }
})

var upload = multer({ storage: storage });

const db = require('monk')('mongodb://milanpasschierbusiness:detering1@ds263137.mlab.com:63137/flexonly');
const users = db.get('users');
const offers = db.get('offers');

var index = require('./routes/index');

var app = express();
app.use(require('express-session')({ secret: 'keyboard cat' }));
app.use(passport.initialize());
app.use(passport.session());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new LinkedInStrategy({
    consumerKey: '78sd9k05an4rz4',
    consumerSecret: '8KOJpw2EWkkiSgHh',
    callbackURL: "https://flexonly-milanpasschierbusiness299704.codeanyapp.com/auth/linkedin/callback",
    profileFields: ['id', 'first-name', 'last-name', 'email-address', 'headline', 'location', 'summary', 'specialties', 'positions', 'picture-urls::(original)', 'public-profile-url', 'picture-url']
  },
  function(token, tokenSecret, profile, done) {
  console.log(profile);
    // asynchronous verification, for effect...
    process.nextTick(function () {
      // To keep the example simple, the user's LinkedIn profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the LinkedIn account with a user record in your database,
      // and return that user instead.
      
users.findOne({email: profile._json.emailAddress}).then((doc) => {
  
  if (doc == null) {
    var user_profile_picture = profile._json.pictureUrl;
    var user_id = randomstring.generate(10);
    users.insert({user_id: user_id, first_name: profile._json.firstName, last_name: profile._json.lastName, email: profile._json.emailAddress, username: profile._json.emailAddress, headline: profile._json.headline, user_profile_picture: user_profile_picture, welcome: '0'});
    return done(null, profile);
  } else {
    return done(null, profile);
  }
    
  }).catch((err) => {
    console.log(err);
  });
      
    });
  }
));



app.get('/auth/linkedin',
  passport.authenticate('linkedin', { scope: ['r_basicprofile', 'r_emailaddress'] }));

app.get('/auth/linkedin/callback', 
  passport.authenticate('linkedin', { failureRedirect: '/' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/account');
  });

app.get('/', function(req, res){
  
  if (req.isAuthenticated()) {

    users.findOne({email: req.user._json.emailAddress}).then((doc) => {

      res.render('index', { user: doc });

    }).catch((err) => {
      console.log('error');
    });
    
  } else {
    
    res.render('index');
    
  }
  
});

app.get('/signin', function(req, res) {

  if (req.isAuthenticated()) { 
    res.redirect('/account');
  } else {
    res.render('signin/index');
  }
  
});

app.get('/welcome', ensureAuthenticated, function(req, res) {
  
  users.findOne({email: req.user._json.emailAddress}).then((doc) => {
    
    if (doc.welcome === '1') {
      res.redirect('/account');
    } else {
      res.render('welcome/index', { user: doc });
    }

  }).catch((err) => {
    console.log('error');
  });
  
});

app.get('/welcome/form', ensureAuthenticated, function(req, res) {

    console.log(req.query.KvKInput);
  
    url = 'https://openkvk.nl/zoeken/' + req.query.KvKInput;

    request(url, function(error, response, html){

      // First we'll check to make sure no errors occurred when making the request

      if (!error) {

          // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality

          var $ = cheerio.load(html);

          // Finally, we'll define the variables we're going to capture

          var title, release, rating;
          var json = { title : "", release : "", rating : ""};
        
 var p1 = new Promise(function(resolve, reject) {
   
          var json = [  
              { "company": "", "company_number": "", "company_address": "", "company_zip_code": "", "company_city": "" }
          ];
        
          $('ul#kvkResults a.list-group-item').each(function (i, elem) {
            
            $(elem).find('h4.list-group-item-heading').each(function (index, element) {
              var company = $(element).text();
              json[i].company = company;
            });
            
            $(elem).find('strong.companyNumber').each(function (index, element) {
              var company_number = $(element).text();
              json[i].company_number = company_number;
            });
            
            $(elem).find('span.address').each(function (index, element) {
              var company_address = $(element).text();
              json[i].company_address = company_address;
            });
            
            $(elem).find('span.zipCode').each(function (index, element) {
              var company_zip_code = $(element).text();
              json[i].company_zip_code = company_zip_code;
            });
            
            $(elem).find('span.city').each(function (index, element) {
              var company_city = $(element).text();
              json[i].company_city = company_city;
            });
            
          });
   
          console.log(json);
          resolve(json);

});
        
p1.then(function(val) {
  
      res.send(val);
  
    });         
        
      }

    });
  
});

app.post('/welcome/form', ensureAuthenticated, function(req, res) {
  console.log(req.body);
  
   var p2 = new Promise(function(resolve, reject) {

  var options = {
    provider: 'mapquest',

    // Optional depending on the providers
    httpAdapter: 'https', // Default
    apiKey: 'MV0D1mI7V75QNpG69veRuuxD9JjCZmge', // for Mapquest, OpenCage, Google Premier
    formatter: null         // 'gpx', 'string', ...
  };
  var geocoder = NodeGeocoder(options);
  
  geocoder.geocode(req.body.address + ', ' + req.body.zip_code + ', ' + req.body.city + ', Netherlands')
    .then(function(res) {
    
  
  users.update({email: req.user._json.emailAddress}, {
    $set: { welcome: '1',
      company: {
      "company": req.body.company,
      "company_number": req.body.company_number,
      "company_address": req.body.address,
      "company_zip_code": req.body.zip_code,
      "company_city": req.body.city,
      "country": 'NL',
      "latitude": res[0].latitude,
      "longitude": res[0].longitude
    } }
  });
    
    var message = 'success';
  
    resolve(message);
    
  })
    .catch(function(err) {
      console.log(err);
  });
     
   });
        
p2.then(function(val) {
  
      res.send(val);
  
    });
  
});

app.get('/account', ensureAuthenticated, function(req, res) {
  
  users.findOne({email: req.user._json.emailAddress}).then((doc) => {
    
    if (doc.welcome == 1) { res.render('account/index', { user: doc }); }
    res.redirect('/welcome');

  }).catch((err) => {
    console.log('error');
  });
  
});

app.get('/account/offer', ensureAuthenticated, function(req, res) {
  
  users.findOne({email: req.user._json.emailAddress}).then((doc) => {

    res.render('account/offer/index', { user: doc });

  }).catch((err) => {
    console.log('error');
  });
  
});

var options = {
  provider: 'mapquest',
 
  // Optional depending on the providers
  httpAdapter: 'https', // Default
  apiKey: 'MV0D1mI7V75QNpG69veRuuxD9JjCZmge', // for Mapquest, OpenCage, Google Premier
  formatter: null         // 'gpx', 'string', ...
};
var geocoder = NodeGeocoder(options);

app.post('/account/offer', ensureAuthenticated, upload.single('cover'), function(req, res) {
  
  var path = req.file.path.replace('public/','');
  
  geocoder.geocode(req.body.street + ' ' + req.body.house_number + ', ' + req.body.zip_code + ', ' + req.body.city + ', Netherlands')
    .then(function(res) {
      offers.insert({
        company: req.body.company,
        job: req.body.job,
        job_description: req.body.job_description,
        skills: req.body.skills,
        salary: req.body.salary,
        location: {
          street: req.body.street,
          house_number: req.body.house_number,
          zip_code: req.body.zip_code,
          city: req.body.city,
          country: 'NL',
          latitude: res[0].latitude,
          longitude: res[0].longitude
        },
        start_date: req.body.start_date,
        end_date: req.body.end_date,
        icon: req.body.icon,
        cover: path,
        user_id: req.body.user_id
      });
    })
    .catch(function(err) {
      console.log(err);
  });
  
  res.redirect('/account/offer');
  
});

app.get('/', function(req, res) {
  
  
  if (req.isAuthenticated()) { 
  users.findOne({email: req.user._json.emailAddress}).then((doc) => {

    res.render('index', { user: doc });
  }).catch((err) => {
    console.log('error');
  });
  } else {
    res.render('index');
  }
  
});

app.get('/map_data_offers', function(req, res) {
  offers.find({}).then((docs) => {
    res.send(docs);
  });
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/signin');
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
