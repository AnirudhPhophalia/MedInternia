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
        const rawEmail = profile.emails?.[0].value;
        if (!rawEmail) {
          return done(new Error("No email found from Google"), undefined);
        }

        // Lowercase email to avoid case-sensitive duplicate accounts
        const email = rawEmail.toLowerCase();

        let existingUser = await User.findOne({ email: email });

        if (existingUser) {
          return done(null, existingUser);
        } else {
          // Standard high-entropy random password
          const randomPassword = crypto.randomBytes(24).toString('hex');

          const newUser = new User({
            firstName: profile.name?.givenName || 'Google',
            lastName: profile.name?.familyName || 'User',
            email: email,
            password: randomPassword,
            userType: 'patient', // Reverted to 'patient' to avoid strict Mongoose validation crashes (intern requires medicalSchool)
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