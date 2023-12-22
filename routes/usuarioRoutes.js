import express from "express";
import { formularioLogin, autenticar,formularioRegistro, registrar, confirmar, formularioOlvidePassword, resertPassword, comprobarToken, nuevoPassword, cerrarSesion } from "../controllers/usuarioController.js";

const router = express.Router();

router.get('/login', formularioLogin);
router.post('/login', autenticar);

// Cerrar sesión
router.post('/cerrar-sesion', cerrarSesion)

router.get('/registro', formularioRegistro);
router.post('/registro', registrar);

router.get('/confirmar/:token', confirmar)

router.get('/olvide-password', formularioOlvidePassword);
router.post('/olvide-password', resertPassword);

// Almacena el nuevo password
router.get('/olvide-password/:token', comprobarToken)
router.post('/olvide-password/:token', nuevoPassword)

export default router