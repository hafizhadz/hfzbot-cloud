// ── Passport.js Configuration ──────────────────────────────────────────────
// Google OAuth 2.0 strategy using passport-google-oauth20.
// Uses JWT-based auth (stateless) — no session serialization needed.

import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { env } from "./env.js";
import { findOrCreateGoogleUser } from "../services/auth.service.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: env.google.clientId,
      clientSecret: env.google.clientSecret,
      callbackURL: env.google.callbackUrl,
      scope: ["profile", "email"],
      state: false,
    },
    async (_accessToken: string, _refreshToken: string, profile: Profile, done: (err: Error | null, user?: any) => void) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const avatar = profile.photos?.[0]?.value;
        const googleId = profile.id;

        if (!email) {
          return done(new Error("Google account has no email"), undefined);
        }

        const user = await findOrCreateGoogleUser({
          id: googleId,
          email,
          name,
          avatar,
        });

        return done(null, { id: user.id });
      } catch (err) {
        return done(err as Error, undefined);
      }
    },
  ),
);

export default passport;
