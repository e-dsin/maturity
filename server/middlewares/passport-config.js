const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const { pool } = require('../db/dbConnection');
const authService = require('../services/auth-services');

// Stratégie locale pour l'authentification par email/mot de passe
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await authService.authenticateLocal(email, password);
    return done(null, user);
  } catch (error) {
    return done(null, false, { message: error.message });
  }
}));

// Stratégie JWT pour l'authentification des API
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
}, async (payload, done) => {
  try {
    // Vérifier si l'utilisateur existe toujours et est actif
    const [users] = await pool.query(
      'SELECT * FROM acteurs WHERE id_acteur = ? AND is_active = true',
      [payload.id_acteur]
    );

    if (users.length > 0) {
      return done(null, users[0]);
    } else {
      return done(null, false);
    }
  } catch (error) {
    return done(error, false);
  }
}));

// Sérialisation pour les sessions (si nécessaire)
passport.serializeUser((user, done) => {
  done(null, user.id_acteur);
});

passport.deserializeUser(async (id, done) => {
  try {
    const [users] = await pool.query(
      'SELECT * FROM acteurs WHERE id_acteur = ? AND is_active = true',
      [id]
    );
    
    if (users.length > 0) {
      done(null, users[0]);
    } else {
      done(null, false);
    }
  } catch (error) {
    done(error, false);
  }
});

module.exports = passport;