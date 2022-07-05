const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config()
const User = require('../models/user');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id).then((user) => {
        done(null, user);
    });
});

passport.use(
    new GoogleStrategy({
        // options for google strategy
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/redirect'
    }, (accessToken, refreshToken, profile, done) => {
        // passport callback function
        User.findOne({googleId: profile.id}).then((currentUser) => {
            if(currentUser){
                // user already present
                console.log('user is: ', currentUser);
                done(null, currentUser);
            }else{
                User.create({
                    name:profile.displayName,
                    googleId:profile.id,
                    email:profile.emails[0].value
                }).then(user=>{
                    console.log("New user",user);
                    done(null,user);
                })
                .catch(err=>console.log(err))
            }
        }).catch(err=>console.log(err))

    })
);