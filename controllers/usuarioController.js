import {check, validationResult} from 'express-validator'
import bcrypt from 'bcrypt'
import Usuario from "../models/Usuario.js"
import { generarJWT, generarId } from "../helpers/tokens.js"
import { emailRegistro, emailOlvidePassword } from "../helpers/emails.js"

const formularioLogin = (req, res) => {
    res.render('auth/login', {
        pagina: 'Iniciar Sesión',
        csrfToken : req.csrfToken()
    })
}

const autenticar = async (req, res) =>{
    // Validación
    await check('email').isEmail().withMessage('El Email es obligatorio').run(req)
    await check('password').notEmpty().withMessage('El Password es obligatorio').run(req)

    let resultado = validationResult(req)

    // Verificar que el resultado este vacio
    if(!resultado.isEmpty()){
        //Errores
        return res.render('auth/login', {
            pagina: 'Iniciar sesión',
            csrfToken : req.csrfToken(),
            errores: resultado.array()
        })
    }

    const {email, password} = req.body

    // Comprobar si el usuario existe
    const usuario = await Usuario.findOne({where: {email}})
    if(!usuario){
        return res.render('auth/login', {
            pagina: 'Iniciar sesión',
            csrfToken : req.csrfToken(),
            errores: [{msg: 'El usuario no existe'}]
        })
    }

    // Comprobar si el usuario esta confirmado
    if(!usuario.confirmado){
        return res.render('auth/login', {
            pagina: 'Iniciar sesión',
            csrfToken : req.csrfToken(),
            errores: [{msg: 'Tu Cuenta no a sido confirmada'}]
        })
    }

    // Revisar el password
    if(!usuario.verificarPassword(password)){
        return res.render('auth/login', {
            pagina: 'Iniciar sesión',
            csrfToken : req.csrfToken(),
            errores: [{msg: 'El password es incorrecto'}]
        })
    }

    // Autenticar al usuario
    const token = generarJWT({id: usuario.id, nombre: usuario.nombre})
    console.log(token)

    //Almacenar en un cookie
    return res.cookie('_token', token, {
        httpOnly: true
        //secure: true,
        //sameSite: true
    }).redirect('/home/mis-propiedades')
}

const cerrarSesion = (req, res) => {
    return res.clearCookie('_token').status(200).redirect('/login')
}

const formularioRegistro = (req, res) => {
    res.render('auth/registro', {
        pagina: 'Crear cuenta',
        csrfToken : req.csrfToken()
    })
}

const registrar = async (req, res) =>{

    //Validación
    await check('nombre').notEmpty().withMessage('El nombre no puede ir vacio').run(req)
    await check('email').isEmail().withMessage('Eso no parece un Email').run(req)
    await check('password').isLength({min: 6}).withMessage('El password debe de ser al menos de 6 caracteres').run(req)
    await check('repetir_password').equals(req.body.password).withMessage('Los Passwords no son iguales').run(req)

    let resultado = validationResult(req)

    //return res.json(resultado.array())
    // Verificar que el resultado este vacio
    if(!resultado.isEmpty()){
        //Errores
        return res.render('auth/registro', {
            pagina: 'Crear cuenta',
            csrfToken : req.csrfToken(),
            errores: resultado.array(),
            usuario: {
                nombre: req.body.nombre,
                email: req.body.email
            }
        })
    }

    //Extraer los datos
    const { nombre, email, password } = req.body

    // Verificar que el usuario no este duplicado
    const existeUsuario = await Usuario.findOne({ where: { email }})
    if(existeUsuario){
        return res.render('auth/registro', {
            pagina: 'Crear cuenta',
            csrfToken : req.csrfToken(),
            errores: [{msg: 'El usuario ya esta registrado'}],
            usuario: {
                nombre: req.body.nombre,
                email: req.body.email
            }
        })
    }
    
    // Almacenar un usuario
    const usuario = await Usuario.create({
        nombre,
        email,
        password,
        token: generarId()
    })

    // Envia Email de Confirmación
    emailRegistro({
        nombre: usuario.nombre,
        email : usuario.email,
        token: usuario.token
    })

    //Mostrar mensaje de confirmación
    res.render('templates/mensaje', {
        pagina: 'Cuenta Creada Correctamente',
        mensaje: 'Hemos enviado un Email de Confirmación, presione en el enlace'
    })
}

// Función que comprueba una cuenta
const confirmar = async (req, res) => {
    const {token} = req.params

    //Verificar si el Token es valido
    const usuario = await Usuario.findOne({where: {token}})
    
    if(!usuario){
        return res.render('auth/confirmar-cuenta', {
            pagina: 'Error al confirmar tu cuenta',
            mensaje: 'Hubo en error al confirmar tu cuenta, intenta de nuevo',
            error: true
        })
    }
    //Confirmar la cuenta
    usuario.token = null;
    usuario.confirmado = true;
    await usuario.save();

    res.render('auth/confirmar-cuenta', {
        pagina: 'Cuenta confirmada',
        mensaje: 'La cuenta se confirmó correctamente'
    })

}

const formularioOlvidePassword = (req, res) => {
    res.render('auth/olvide-password', {
        pagina: 'Recupera tu acceso a Bienes Raices',
        csrfToken : req.csrfToken()
    })
}

const resertPassword = async (req, res) =>{
    //Validación
    await check('email').isEmail().withMessage('Eso no parece un Email').run(req)

    let resultado = validationResult(req)

    // Verificar que el resultado este vacio
    if(!resultado.isEmpty()){
        //Errores
        return res.render('auth/olvide-password', {
            pagina: 'Recupera tu acceso a Bienes Raices',
            csrfToken : req.csrfToken(),
            errores: resultado.array()
        })
    }

    //Buscar al usuario
    const { email } = req.body
    const usuario = await Usuario.findOne({where: {email}})
    
    if(!usuario){
        return res.render('auth/olvide-password', {
            pagina: 'Recupera tu acceso a Bienes Raices',
            csrfToken : req.csrfToken(),
            errores: [{msg: 'El Email no pertenece a ningun usuario'}]
        })
    }

    // Generar un Token y enviar un Email
    usuario.token = generarId();
    await usuario.save();

    //Enviar un Email
    emailOlvidePassword({
        email: usuario.email, 
        nombre: usuario.nombre,
        token: usuario.token
    })

    //Renderizar un mensaje
    res.render('templates/mensaje', {
        pagina: 'Restablece tu password',
        mensaje: 'Hemos enviado un Email con las instrucciones'
    } )

}

const comprobarToken = async (req, res) => {
    const { token } = req.params;
    const usuario = await Usuario.findOne({where: {token}})
    if(!usuario){
        return res.render('auth/confirmar-cuenta', {
            pagina: 'Restablece tu password',
            mensaje: 'Hubo en error al validar tu información, intenta de nuevo',
            error: true
        })
    }

    // Mostrar formulario para modificar el password
    res.render('auth/reset-password', {
        pagina: 'Restablece tu password',
        csrfToken : req.csrfToken()
    })
}

const nuevoPassword = async (req, res) => {
    // Validar el password
    await check('password').isLength({min: 6}).withMessage('El password debe de ser al menos de 6 caracteres').run(req)

    let resultado = validationResult(req)

    // Verificar que el resultado este vacio
    if(!resultado.isEmpty()){
        //Errores
        return res.render('auth/reset-password', {
            pagina: 'Restablece Tu Password',
            csrfToken : req.csrfToken(),
            errores: resultado.array(),
            usuario: {
                nombre: req.body.nombre,
                email: req.body.email
            }
        })
    }

    const { token } = req.params
    const { password } = req.body;
    // Identificar el nuevo password
    const usuario = await Usuario.findOne({where: {token}})
    // Hashear el nuevo password
    const salt = await bcrypt.genSalt(10)
    usuario.password = await bcrypt.hash( password, salt);
    usuario.token = null;

    await usuario.save();
    res.render('auth/confirmar-cuenta', {
        pagina: 'Password Restablecido',
        mensaje: 'El Password Se Guardo Correctamente',
    })
}   

export {
    formularioLogin,
    autenticar,
    cerrarSesion,
    formularioRegistro,
    registrar,
    confirmar,
    formularioOlvidePassword,
    resertPassword,
    comprobarToken,
    nuevoPassword
}