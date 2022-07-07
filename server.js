const express = require('express')
const bodyParser = require('body-parser')
const passport = require('passport');
const cookieSession = require('cookie-session');
const passportSetup = require('./config/passport-setup');
const mongoose = require('mongoose');
const session = require('express-session')
const nodemailer = require('nodemailer')
const idGenerator = require('./utils/id_generator')
const app = express()
require('dotenv').config()
const server = require('http').Server(app)
const io = require('socket.io')(server, {
    cors: {
        origin: process.env.PORT,
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling'],
        credentials: true
    },
    allowEIO3: true
})

const { ExpressPeerServer } = require('peer');



const peerServer = ExpressPeerServer(server, {
    debug: true
});


app.use('/peerjs', peerServer);

app.set('view engine', 'ejs')
app.use(express.static('public'))



app.use(session({
    resave: false,
    saveUninitialized:true,
    secret: process.env.cookieKey,
    maxAge: 30 * 24 * 60 * 60 * 1000,
}))


app.use(passport.initialize());
app.use(passport.session());



//TODO setting up and connecting to mongoDB database 
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.dbURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('MongoDB connected!!');
    } catch (err) {
        console.log('Failed to connect to MongoDB', err);
    }
};

connectDB();

const authCheck = (req, res, next) => {
    if(!req.user){
        res.redirect('/login');
    } else {
        next();
    }
};



app.get('/', authCheck,  (req, res) => {
    // console.log(req.user)
    meetID = idGenerator();
    // console.log(req.isAuthenticated())
    res.render('home', {user: req.user.username, email: req.user.email, meetID: meetID})
})


app.get('/room', authCheck, (req, res) => {
    const meetingID = idGenerator()
    res.redirect(`/room/${meetingID}`)
})


app.get('/test', (req, res) => {
    res.render('test');
})
app.get('/login',  (req, res) => {
    if(req.user){
        res.redirect('/');
    }
    else res.render('login')
})


app.get('/room/:room', authCheck, (req, res) => {
    res.render('room', {roomId: req.params.room, user: req.user.username})
})

app.get('/auth/google', passport.authenticate('google', {
    scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
    ]
}));

app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });

app.get('/auth/google/redirect', passport.authenticate('google'), (req, res) => {
    username = req.user.username
    res.redirect('/');
});



// -----------web socket stuff--------------------------

var allUsers = {}

io.on('connection', socket => {
    console.log("connected")
    const peers = []
    let userID;
    socket.on('join-room', (roomID, userID, USER) => {
        allUsers[userID] = USER
        
        console.log(userID, "joined in", roomID)
        socket.join(roomID)
        socket.broadcast.to(roomID).emit('user-connected', userID)


        socket.on("send-message", (message, USER) => {
            console.log("message received in backend", userID)
            socket.broadcast.to(roomID).emit("receive-message", { by: USER, message: message });
        })

        socket.on('end-call', () =>{
            socket.to(roomID).emit('user-disconnected', userID);
            
        })
        socket.on('disconnect', () => {
            console.log("disconnect", userID);
            socket.to(roomID).emit('user-disconnected', userID)
        })
    })


})

// Mailing
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
       user: "calledge.office@gmail.com",
       pass: process.env.password
    },
    debug: false,
    logger: true
});



app.post('/invite', (req, res) => {
    const meetID = req.body.meetID
    const templateMaker = (id) => {
        return  {
            from: "calledge.office@gmail.com",
            to: id,
            subject: `Meeting Invitation`,
            text: "Invitaion mail",
            html: `<p>Hey callEDGE user!<br>You have been invited to a new meeting scheduled on <b> ${req.body.date}</b> at <b> ${req.body.time}</b>.<br>Do join in. See you there! </p>
            Meet ID: <b>${meetID}</b> <br>
             You can also <a href = "https://call-edge.herokuapp.com/room/${meetID}">click here </a> to join.`
          };
    }
    req.body.mailIDs.forEach(id => {
        emailTransporter.sendMail(templateMaker(id));
    })
    res.redirect('/');
    // emailTransporter.sendMail(mailOptions);

}) 

server.listen(process.env.PORT || 3002)
