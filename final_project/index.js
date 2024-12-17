const express = require('express');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const customer_routes = require('./router/auth_users.js').authenticated;
const genl_routes = require('./router/general.js').general;

const app = express();

app.use(express.json());

// Middleware de sesión
app.use("/customer", session({ 
    secret: "fingerprint_customer", 
    resave: true, 
    saveUninitialized: true 
}));

// Middleware de autenticación
app.use("/customer/auth/*", function auth(req, res, next) {
    // Obtener el token del header 'Authorization'
    const token = req.headers['authorization'];

    // Validar que el token existe
    if (!token) {
        return res.status(401).json({ message: "Token de acceso requerido" });
    }

    // Extraer el token eliminando el prefijo 'Bearer '
    const accessToken = token.split(' ')[1];

    // Verificar el token con la clave secreta
    jwt.verify(accessToken, "fingerprint_customer", (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Token inválido o expirado" });
        }

        // Almacenar información del usuario decodificado en la solicitud
        req.user = decoded;

        // Continuar con el siguiente middleware o ruta
        next();
    });
});

// Rutas autenticadas
app.use("/customer", customer_routes);

// Rutas generales
app.use("/", genl_routes);

// Inicio del servidor
const PORT = 5000;
app.listen(PORT, () => console.log("Server is running on port", PORT));
