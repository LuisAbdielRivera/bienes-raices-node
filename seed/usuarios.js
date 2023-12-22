import bcryt from 'bcrypt'

const usuarios = [
    {
        nombre: 'Abdiel',
        email: 'abdiel@gmail.com', 
        confirmado: 1,
        password: bcryt.hashSync('password', 10)
    }
]

export default usuarios