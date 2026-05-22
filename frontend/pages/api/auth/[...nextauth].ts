import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import axios from "axios";

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        try {
          const res = await axios.post(process.env.NEXT_PUBLIC_API_URL + '/auth/google', {
            email: user.email,
            firstName: user.name?.split(' ')[0] || 'Google',
            lastName: user.name?.split(' ').slice(1).join(' ') || 'User',
            profilePicture: user.image
          });
          
          token.backendToken = res.data.data.token;
          token.role = res.data.data.user.userType;
          token.userId = res.data.data.user._id;
        } catch (error) {
          console.error("Backend auth failed:", error);
        }
      }
      return token;
    },
    async session({ session, token }: any) {
      session.backendToken = token.backendToken;
      session.role = token.role;
      session.userId = token.userId;
      return session;
    }
  }
});