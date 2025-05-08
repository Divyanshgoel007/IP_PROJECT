/**
 * @file passport.js
 * @description Passport configuration for authentication strategies
 */
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/user.model');

/**
 * Configure Passport with Google and Facebook auth strategies
 */
const configurePassport = () => {
  // Serialize user to session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Configure Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${process.env.API_BASE_URL}/api/auth/google/callback`,
          passReqToCallback: true,
          scope: ['profile', 'email']
        },
        async (req, accessToken, refreshToken, profile, done) => {
          try {
            // Check if user exists
            let user = await User.findOne({ 'google.id': profile.id });

            if (user) {
              // Update last login
              user.lastLogin = Date.now();
              await user.save();
              return done(null, user);
            }

            // Check if email is already registered
            if (profile.emails && profile.emails.length) {
              const email = profile.emails[0].value;
              user = await User.findOne({ email });

              if (user) {
                // Link Google account to existing user
                user.google = {
                  id: profile.id,
                  email: email,
                  name: profile.displayName
                };
                user.lastLogin = Date.now();
                await user.save();
                return done(null, user);
              }
            }

            // Create new user
            const newUser = await User.create({
              firstName: profile.name.givenName || profile.displayName.split(' ')[0],
              lastName: profile.name.familyName || profile.displayName.split(' ').slice(1).join(' '),
              email: profile.emails[0].value,
              isEmailVerified: true, // Email is verified by Google
              phone: '',
              password: Math.random().toString(36).slice(-12), // Random password
              google: {
                id: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName
              },
              lastLogin: Date.now()
            });

            return done(null, newUser);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
    console.log('📱 [Passport] Google strategy configured');
  } else {
    console.warn('⚠️ [Passport] Google strategy not configured (missing env vars)');
  }

  // Configure Facebook OAuth Strategy
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: `${process.env.API_BASE_URL}/api/auth/facebook/callback`,
          profileFields: ['id', 'emails', 'name', 'displayName'],
          passReqToCallback: true
        },
        async (req, accessToken, refreshToken, profile, done) => {
          try {
            // Check if user exists
            let user = await User.findOne({ 'facebook.id': profile.id });

            if (user) {
              // Update last login
              user.lastLogin = Date.now();
              await user.save();
              return done(null, user);
            }

            // Check if email is already registered
            if (profile.emails && profile.emails.length) {
              const email = profile.emails[0].value;
              user = await User.findOne({ email });

              if (user) {
                // Link Facebook account to existing user
                user.facebook = {
                  id: profile.id,
                  email: email,
                  name: profile.displayName
                };
                user.lastLogin = Date.now();
                await user.save();
                return done(null, user);
              }
            }

            // Create new user
            const newUser = await User.create({
              firstName: profile.name.givenName || profile.displayName.split(' ')[0],
              lastName: profile.name.familyName || profile.displayName.split(' ').slice(1).join(' '),
              email: profile.emails[0].value,
              isEmailVerified: true, // Email is verified by Facebook
              phone: '',
              password: Math.random().toString(36).slice(-12), // Random password
              facebook: {
                id: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName
              },
              lastLogin: Date.now()
            });

            return done(null, newUser);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
    console.log('📱 [Passport] Facebook strategy configured');
  } else {
    console.warn('⚠️ [Passport] Facebook strategy not configured (missing env vars)');
  }
};

module.exports = configurePassport; 