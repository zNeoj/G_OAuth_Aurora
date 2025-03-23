const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

const app = express();
console.log('hola');
// Middleware para parsear JSON
app.use(express.json());

// // Configuración de sesión
app.use(session({
    secret: 'aurorasecret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 15 // 15 minutos
    }
}));

// Inicializar Passport y restaurar estado de autenticación desde la sesión
app.use(passport.initialize());
app.use(passport.session());

// Configuración de la estrategia de Google
passport.use(new GoogleStrategy({
    clientID: 'a',
    clientSecret: 'a',
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    // Verificar el dominio del correo
    const email = profile.emails[0].value;
    
    if (!email.endsWith('@itmexicali.edu.mx')) {
      return cb(null, false, { 
        message: 'Solo se permiten correos institucionales @itmexicali.edu.mx' 
      });
    }

    // Si el correo es válido, retornamos el perfil, y es lo que se almacena en req.user
    return cb(null, {
      id: profile.id,
      email: email,
      name: profile.displayName,
      photoUrl: profile.photos?.[0]?.value || null,
      accessToken: accessToken
    });
  }
));

// Serialización del usuario para la sesión
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialización del usuario desde la sesión
passport.deserializeUser((user, done) => {
    done(null, user);
});

// Middleware para verificar si el usuario está autenticado
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/google');
}

// Ruta inicial de autenticación
app.get('/auth/google',
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        hostedDomain: 'itmexicali.edu.mx' // Restringe al dominio institucional
    })
);

// Callback URL después de la autenticación con Google
app.get('/auth/google/callback', 
    passport.authenticate('google', { 
        failureRedirect: '/error',
        session: true 
    }),
    function(req, res) {
        // Autenticación exitosa
        res.json({
            message: 'Autenticación exitosa',
            user: req.user
        });
    }
);

// Ruta protegida de ejemplo
app.get('/profile', ensureAuthenticated, (req, res) => {
    res.json({
        user: req.user,
        message: 'Perfil autenticado'
    });
});

app.get('/logout', (req, res) => {
  // 1. Passport limpia su autenticación
  req.logout((err) => {
      if (err) return next(err);
      
      // 2. express-session limpia su sesión
      req.session.destroy((err) => {
          if (err) return next(err);
          
          // 3. Tú limpias lo que enviaste al cliente
          res.clearCookie('connect.sid');
          
          console.log(`[2025-03-23 04:31:15] Usuario ${req.user?.email} deslogueado completamente. Debe salir como "undefined".`);
          res.redirect('/');
      });
  });
});

// Ruta de error
app.get('/error', (req, res) => {
    res.status(401).json({
        error: 'Autenticación fallida',
        message: 'Solo se permiten correos institucionales @itmexicali.edu.mx'
    });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});