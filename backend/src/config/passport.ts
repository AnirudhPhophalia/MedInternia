// @ts-nocheck
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import crypto from 'crypto';
import User from '../models/User';
import dotenv from 'dotenv';
dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: process.env.GOOGLE_CALLBACK_URL as string,
    },
    async (accessToken: any, refreshToken: any, profile: any, done: any) => {
      try {
        const email = profile.emails?.[0].value;
        if (!email) {
          return done(new Error("No email found from Google"), undefined);
        }

        let existingUser = await User.findOne({ email: email });

        if (existingUser) {
          return done(null, existingUser);
        } else {
          const randomPassword = crypto.randomBytes(20).toString('hex') + "A1@!";

          const newUser = new User({
            firstName: profile.name?.givenName || 'Google',
            lastName: profile.name?.familyName || 'User',
            email: email,
            password: randomPassword,
            userType: 'intern', // Changed from 'patient' to 'intern' to natively match dashboard permissions
            isVerified: true,
            profilePicture: profile.photos?.[0]?.value || '',
          });

          await newUser.save();
          return done(null, newUser);
        }
      } catch (error) {
        console.error("Error in Google Strategy:", error);
        return done(error, undefined);
      }
    }
  )
);

export default passport;