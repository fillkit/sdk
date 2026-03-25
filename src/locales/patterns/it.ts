import type { MultilingualPatterns } from '../index.js';

export const it: MultilingualPatterns = {
  name: {
    // Contact
    email: [/email/i, /e-mail/i, /posta/i, /mail/i],
    phone: [/telefono/i, /tel/i, /cellulare/i, /mobile/i],
    username: [/nome.utente/i, /username/i, /login/i],
    password: [/password/i, /parola.d.ordine/i],
    confirmPassword: [
      /conferma.*password/i,
      /ripeti.*password/i,
      /password.*conferma/i,
    ],
    website: [/sito.web/i, /sito.internet/i, /url/i, /web/i],

    // Personal
    fullName: [/nome/i, /nome.completo/i],
    'name.given': [/nome/i, /primo.nome/i],
    'name.family': [/cognome/i, /ultimo.nome/i],
    middleName: [/secondo.nome/i],
    'name.prefix': [/prefisso/i, /titolo/i],
    'name.suffix': [/suffisso/i],
    gender: [/genere/i, /sesso/i],
    birthDate: [/data.di.nascita/i, /nascita/i, /compleanno/i],
    age: [/^età$/i, /^eta$/i],
    bio: [/biografia/i, /bio/i, /chi.sono/i, /descrizione/i],
    ssn: [/codice.fiscale/i, /cf/i],

    // Business
    company: [/azienda/i, /società/i, /organizzazione/i, /datore.di.lavoro/i],
    jobTitle: [/qualifica/i, /posizione/i, /professione/i, /ruolo/i],
    department: [/dipartimento/i, /reparto/i, /divisione/i],

    // Location
    'address.line1': [/indirizzo/i, /via/i],
    'address.line2': [/indirizzo.?2/i, /appartamento/i, /interno/i, /scala/i],
    city: [/città/i, /citta/i, /comune/i],
    state: [/stato/i, /provincia/i, /regione/i],
    postalCode: [/cap/i, /codice.postale/i],
    country: [/paese/i, /nazione/i],

    // Financial
    'creditCard.number': [
      /numero.della.carta/i,
      /carta.di.credito/i,
      /numero.carta/i,
    ],
    'creditCard.cvv': [/cvv/i, /cvc/i, /codice.di.sicurezza/i],
    'creditCard.expiry': [/scadenza/i, /data.di.scadenza/i],
    iban: [/iban/i],

    // Temporal
    date: [/data/i],
  },
  placeholder: {
    email: [/inserisci.*(tuo)?.*email/i, /tua.*email/i],
    phone: [/inserisci.*(tuo)?.*telefono/i, /numero.*telefono/i],
    fullName: [/tuo.nome/i, /nome.completo/i],
    username: [/tuo.*nome.utente/i, /inserisci.*username/i],
    password: [/tua.*password/i, /inserisci.*password/i],
    company: [/nome.*azienda/i, /tua.*azienda/i],
    website: [/https?:\/\//i, /www\./i, /tuo.*sito/i],
    'address.line2': [/appartamento/i, /interno/i, /scala/i],
    state: [/provincia/i, /regione/i],
    birthDate: [/gg\/mm\/aaaa/i, /data.*nascita/i],
    bio: [/parlaci.*di.te/i, /breve.*bio/i],
  },
  label: {
    email: [/email/i, /e-mail/i, /posta/i],
    phone: [/telefono/i, /tel/i],
    fullName: [/nome/i],
    'name.given': [/nome/i],
    'name.family': [/cognome/i],
    middleName: [/secondo nome/i],
    username: [/nome utente/i, /username/i],
    password: [/password/i],
    confirmPassword: [/conferma password/i],
    company: [/azienda/i, /società/i],
    jobTitle: [/qualifica/i, /posizione/i],
    website: [/sito web/i],
    'address.line2': [/indirizzo 2/i, /appartamento/i],
    state: [/provincia/i, /regione/i],
    'creditCard.number': [/numero carta/i],
    'creditCard.cvv': [/cvv/i, /codice di sicurezza/i],
    'creditCard.expiry': [/scadenza/i],
    birthDate: [/data di nascita/i, /compleanno/i],
    age: [/età/i],
    gender: [/genere/i, /sesso/i],
    bio: [/bio/i, /chi sono/i],
  },
};
