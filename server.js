// load the things we need
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var formidable = require('formidable');
var fs = require('fs');
var cookieParser = require('cookie-parser')
var jwt    = require('jsonwebtoken');
var path = require('path');
var User = require('./user.js');

/*
###################################################################################################
########################################--- Settings ----############################################
###################################################################################################
*/

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true, limit: '5mb'}));
app.use(bodyParser.json({extended: false, limit: '5mb'}));
app.use(express.static('uploads'))
app.use(cookieParser())

/*
###################################################################################################
########################################--- Routes ----############################################
###################################################################################################
*/

app.get('/', function(req, res) {
	var token = req.cookies.jwtToken;

	var dir = './uploads/';
	fs.readdir(dir, function(err, dirs) {
		var arr = [];
		if(dirs == undefined || dirs.length == 0) return res.render('landing', {images: []});
		dirs.map(function (file) {
	        arr.push(fs.readdirSync(dir + file).map(function(f) {
	        	return file + '/' + f;
	        }))
	    })
	    arr  = [].concat.apply([], arr);
        if(!token) {
			res.render('landing', {images: arr});
		} else {
	    	res.redirect('/home');
		}
	})
});

app.get('/signin', function(req, res) {
	res.render('signin');
})

app.get('/signup', function(req, res) {
	res.render('signup');
})

app.post('/signin', function(req, res) {
	var user = {
		"email": req.body.email,
		"password": req.body.password
	}
	User.findOne({'email': user.email}, function(err, user) {
		if(err || !user || user.password != req.body.password) return res.send(err || 404);

		var token = jwt.sign({email: user.email}, 'supersecretphrase', {
			expiresIn: 24*60*60 // expires in 24 hours
		});
		res.cookie('jwtToken', token, { maxAge: 900000, httpOnly: true });
		res.redirect('/home')
	})
});

app.post('/signup', function(req, res) {
	var user = {
		"email": req.body.email,
		"password": req.body.password
	}
	user = User(user);
	user.save(function(err) {
		if(!err) {
			var token = jwt.sign({email: user.email}, 'supersecretphrase', {
				expiresIn: 24*60*60 // expires in 24 hours
			});
			res.cookie('jwtToken', token, { maxAge: 900000, httpOnly: true });
			return res.redirect('/home');
		}
		return res.send(err);
	});
})

app.get('/logout', function(req, res) {
	res.clearCookie('jwtToken');
	res.redirect('/');
})

var middle = function (req, res, next) {
	var token = req.cookies.jwtToken;
	jwt.verify(token, 'supersecretphrase', function(err, decoded) {
        if (err) {
            return next(err);
        } else {
            req.user = decoded;
            next();
        }
    });
}

app.get('/home', middle, function(req, res) {
	var dir = './uploads/';
	if (!fs.existsSync(dir)){
		fs.mkdirSync(dir);
	}
	dir += req.user.email;
	if (!fs.existsSync(dir)){
		fs.mkdirSync(dir);
	}
	fs.readdir(dir, function(err, files) {
		if(err) return res.send(err)
		var arr = [];
		files.forEach(function(file) {
			arr.push(req.user.email + '/' + file);
		})
		return res.render('home', {email: req.user.email, images: arr})
	})
});

app.post('/upload', middle, function(req, res) {
	var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
    	var oldpath = files.filetoupload.path;
    	var email = req.user.email;
	    var newpath = './uploads/' + email + '/' + files.filetoupload.name;
	    fs.rename(oldpath, newpath, function (err) {
	    	if (err) return res.send(err);
	    	res.redirect('/home');
	    });
    });
});

app.delete('/removePic/:name', function(req, res) {
	var imageName = req.params['name'];
	fs.unlink('./uploads/' + imageName, function(err) {
		if(err) return res.send(err);
		return res.send(200);
	});
});


/*
###################################################################################################
########################################--- Connect ----############################################
###################################################################################################
*/

mongoose.connect("mongodb://localhost:27017/task");
app.listen(8080);
console.log('8080 is the magic port');