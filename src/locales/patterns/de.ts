import type { MultilingualPatterns } from '../index.js';

export const de: MultilingualPatterns = {
  name: {
    // Contact
    email: [/email/i, /e-mail/i, /mail/i],
    phone: [/telefon/i, /tel/i, /handy/i, /mobil/i],
    username: [/benutzername/i, /anmeldename/i, /login/i],
    password: [/passwort/i, /kennwort/i, /password/i],
    confirmPassword: [
      /passwort.*bestätigen/i,
      /passwort.*wiederholen/i,
      /kennwort.*bestätigen/i,
    ],
    website: [/webseite/i, /website/i, /homepage/i, /url/i],

    // Personal
    fullName: [/name/i, /vollständiger.name/i],
    'name.given': [/vorname/i],
    'name.family': [/nachname/i, /familienname/i],
    middleName: [/zweiter.vorname/i, /mittelname/i],
    'name.prefix': [/anrede/i, /titel/i],
    'name.suffix': [/namenszusatz/i, /suffix/i],
    gender: [/geschlecht/i],
    birthDate: [/geburtsdatum/i, /geb\.?datum/i, /geburtstag/i],
    age: [/^alter$/i],
    bio: [/biografie/i, /bio/i, /über.mich/i, /beschreibung/i],
    ssn: [/sozialversicherungsnummer/i, /sv-nummer/i, /svn/i],

    // Business
    company: [/firma/i, /unternehmen/i, /organisation/i, /arbeitgeber/i],
    jobTitle: [/berufsbezeichnung/i, /position/i, /beruf/i, /stelle/i],
    department: [/abteilung/i, /bereich/i],

    // Location
    'address.line1': [/adresse/i, /straße/i, /strasse/i],
    'address.line2': [/adresszusatz/i, /adresse.?2/i, /wohnung/i],
    city: [/stadt/i, /ort/i],
    state: [/bundesland/i, /kanton/i, /region/i],
    postalCode: [/postleitzahl/i, /plz/i],
    country: [/land/i],

    // Financial
    'creditCard.number': [
      /kartennummer/i,
      /kreditkarte/i,
      /kreditkartennummer/i,
    ],
    'creditCard.cvv': [/cvv/i, /cvc/i, /prüfnummer/i, /sicherheitscode/i],
    'creditCard.expiry': [/gültig.bis/i, /ablaufdatum/i, /gültigkeit/i],
    iban: [/iban/i],

    // Temporal
    date: [/datum/i],
  },
  placeholder: {
    email: [/geben.sie.*email/i, /ihre.*email/i, /email.adresse/i],
    phone: [/geben.sie.*telefon/i, /telefonnummer/i],
    fullName: [/ihr.name/i, /vollständiger.name/i],
    username: [/ihr.*benutzername/i, /benutzername.*eingeben/i],
    password: [/ihr.*passwort/i, /passwort.*eingeben/i],
    company: [/firmenname/i, /ihr.*unternehmen/i],
    website: [/https?:\/\//i, /www\./i, /ihre.*webseite/i],
    'address.line2': [/wohnung/i, /zusatz/i],
    state: [/bundesland/i, /kanton/i],
    birthDate: [/tt\.mm\.jjjj/i, /geburtsdatum/i],
    bio: [/erzählen.sie/i, /kurze.*bio/i],
  },
  label: {
    email: [/email/i, /e-mail/i],
    phone: [/telefon/i, /tel/i],
    fullName: [/name/i, /vorname/i],
    'name.given': [/vorname/i],
    'name.family': [/nachname/i],
    middleName: [/zweiter vorname/i],
    username: [/benutzername/i],
    password: [/passwort/i],
    confirmPassword: [/passwort bestätigen/i],
    company: [/firma/i, /unternehmen/i],
    jobTitle: [/beruf/i, /position/i],
    website: [/webseite/i],
    'address.line2': [/adresszusatz/i],
    state: [/bundesland/i],
    'creditCard.number': [/kartennummer/i],
    'creditCard.cvv': [/cvv/i, /prüfnummer/i],
    'creditCard.expiry': [/gültig bis/i, /ablaufdatum/i],
    birthDate: [/geburtsdatum/i, /geburtstag/i],
    age: [/alter/i],
    gender: [/geschlecht/i],
    bio: [/bio/i, /über mich/i],
  },
};
