import type { MultilingualPatterns } from '../index.js';

export const es: MultilingualPatterns = {
  name: {
    // Contact
    email: [/email/i, /e-mail/i, /correo/i, /mail/i],
    phone: [/teléfono/i, /telefono/i, /tel/i, /móvil/i, /movil/i, /celular/i],
    username: [/nombre.de.usuario/i, /usuario/i, /login/i, /nick/i],
    password: [/contraseña/i, /clave/i, /password/i],
    confirmPassword: [
      /confirmar.*contraseña/i,
      /repetir.*contraseña/i,
      /contraseña.*confirm/i,
    ],
    website: [/sitio.web/i, /página.web/i, /url/i, /web/i],

    // Personal
    fullName: [/nombre/i, /nombre.completo/i],
    'name.given': [/nombre/i, /primer.nombre/i],
    'name.family': [/apellido/i, /apellidos/i],
    middleName: [/segundo.nombre/i],
    'name.prefix': [/prefijo/i, /título/i, /tratamiento/i],
    'name.suffix': [/sufijo/i],
    gender: [/género/i, /genero/i, /sexo/i],
    birthDate: [/fecha.de.nacimiento/i, /nacimiento/i, /cumpleaños/i],
    age: [/^edad$/i],
    bio: [/biografía/i, /bio/i, /acerca.de/i, /descripción/i],
    ssn: [/número.de.seguridad.social/i, /nss/i, /seguridad.social/i],

    // Business
    company: [/empresa/i, /compañía/i, /organización/i, /empleador/i],
    jobTitle: [
      /cargo/i,
      /puesto/i,
      /título.del.puesto/i,
      /profesión/i,
      /ocupación/i,
    ],
    department: [/departamento/i, /área/i, /división/i],

    // Location
    'address.line1': [/dirección/i, /direccion/i, /calle/i],
    'address.line2': [/dirección.?2/i, /apartamento/i, /piso/i, /depto/i],
    city: [/ciudad/i, /localidad/i],
    state: [/estado/i, /provincia/i, /comunidad/i, /región/i],
    postalCode: [/código.postal/i, /codigo.postal/i, /cp/i],
    country: [/país/i, /pais/i],

    // Financial
    'creditCard.number': [
      /número.de.tarjeta/i,
      /tarjeta.de.crédito/i,
      /tarjeta/i,
    ],
    'creditCard.cvv': [/cvv/i, /cvc/i, /código.de.seguridad/i],
    'creditCard.expiry': [
      /vencimiento/i,
      /fecha.de.vencimiento/i,
      /expiración/i,
    ],
    iban: [/iban/i],

    // Temporal
    date: [/fecha/i],
  },
  placeholder: {
    email: [/ingrese.*(su)?.*email/i, /su.*email/i, /correo.*electrónico/i],
    phone: [/ingrese.*(su)?.*teléfono/i, /número.*teléfono/i],
    fullName: [/su.nombre/i, /nombre.completo/i],
    username: [/su.*usuario/i, /nombre.de.usuario/i],
    password: [/su.*contraseña/i, /ingrese.*contraseña/i],
    company: [/nombre.*empresa/i, /su.*empresa/i],
    website: [/https?:\/\//i, /www\./i, /su.*sitio.web/i],
    'address.line2': [/apartamento/i, /piso/i, /depto/i],
    state: [/estado/i, /provincia/i],
    birthDate: [/dd\/mm\/aaaa/i, /fecha.*nacimiento/i],
    bio: [/cuéntanos.*sobre.ti/i, /breve.*bio/i],
  },
  label: {
    email: [/email/i, /correo/i],
    phone: [/teléfono/i, /tel/i],
    fullName: [/nombre/i],
    'name.given': [/nombre/i, /primer nombre/i],
    'name.family': [/apellido/i],
    middleName: [/segundo nombre/i],
    username: [/usuario/i, /nombre de usuario/i],
    password: [/contraseña/i],
    confirmPassword: [/confirmar contraseña/i],
    company: [/empresa/i, /compañía/i],
    jobTitle: [/cargo/i, /puesto/i],
    website: [/sitio web/i],
    'address.line2': [/dirección 2/i, /apartamento/i],
    state: [/estado/i, /provincia/i],
    'creditCard.number': [/número de tarjeta/i],
    'creditCard.cvv': [/cvv/i, /código de seguridad/i],
    'creditCard.expiry': [/vencimiento/i, /expiración/i],
    birthDate: [/fecha de nacimiento/i, /cumpleaños/i],
    age: [/edad/i],
    gender: [/género/i, /sexo/i],
    bio: [/bio/i, /acerca de/i],
  },
};
