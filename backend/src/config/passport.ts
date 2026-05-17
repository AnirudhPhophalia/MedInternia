// @ts-nocheck
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import crypto from 'crypto';
import User from '../models/User'; // User schema import kar rahe hain
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
        // 1. Check if user email is available from Google  
        const email = profile.emails?.[0].value;
        if (!email) {
          return done(new Error("No email found from Google"), undefined);
        }

        // 2. Check if user already exists in our MongoDB
        let existingUser = await User.findOne({ email: email });

        if (existingUser) {
          // Agar user pehle se hai, toh usko seedha login karwa do
          return done(null, existingUser);
        } else {
          // 3. Agar user nahi hai, toh ek naya user create karo
          
          // Generate a highly secure random password to satisfy the User Schema
          const randomPassword = crypto.randomBytes(20).toString('hex') + "A1@!";

          const newUser = new User({
            firstName: profile.name?.givenName || 'Google',
            lastName: profile.name?.familyName || 'User',
            email: email,
            password: randomPassword, // Dummy password
            userType: 'patient', // Defaulting to patient
            isVerified: true, // Google accounts are implicitly verified
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