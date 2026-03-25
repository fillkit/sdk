import type { MultilingualPatterns } from '../index.js';

export const fr: MultilingualPatterns = {
  name: {
    // Contact
    email: [/email/i, /e-mail/i, /courriel/i, /mail/i],
    phone: [/téléphone/i, /telephone/i, /tél/i, /tel/i, /portable/i, /mobile/i],
    username: [/nom.d.utilisateur/i, /identifiant/i, /login/i, /pseudo/i],
    password: [/mot.de.passe/i, /mdp/i, /password/i],
    confirmPassword: [
      /confirmer.*mot.de.passe/i,
      /mot.de.passe.*confirm/i,
      /re.?mot.de.passe/i,
    ],
    website: [/site.web/i, /site.internet/i, /url/i, /web/i],

    // Personal
    fullName: [/nom/i, /nom.complet/i],
    'name.given': [/prénom/i, /prenom/i],
    'name.family': [/nom.de.famille/i, /nom/i],
    middleName: [/deuxième.prénom/i, /second.prénom/i],
    'name.prefix': [/civilité/i, /titre/i, /préfixe/i],
    'name.suffix': [/suffixe/i],
    gender: [/genre/i, /sexe/i],
    birthDate: [/date.de.naissance/i, /né.le/i, /naissance/i, /anniversaire/i],
    age: [/^âge$/i, /^age$/i],
    bio: [/biographie/i, /bio/i, /à.propos/i, /description/i],
    ssn: [
      /numéro.de.sécurité.sociale/i,
      /nss/i,
      /sécurité.sociale/i,
      /n°.sécu/i,
    ],

    // Business
    company: [/entreprise/i, /société/i, /organisation/i, /employeur/i],
    jobTitle: [/poste/i, /titre.du.poste/i, /fonction/i, /profession/i],
    department: [/département/i, /service/i, /division/i],

    // Location
    'address.line1': [/adresse/i, /rue/i],
    'address.line2': [
      /adresse.?2/i,
      /complément/i,
      /appartement/i,
      /bâtiment/i,
    ],
    city: [/ville/i, /localité/i],
    state: [/état/i, /province/i, /région/i],
    postalCode: [/code.postal/i, /cp/i],
    country: [/pays/i],

    // Financial
    'creditCard.number': [
      /numéro.de.carte/i,
      /carte.de.crédit/i,
      /carte.bancaire/i,
    ],
    'creditCard.cvv': [/cvv/i, /cvc/i, /cryptogramme/i, /code.de.sécurité/i],
    'creditCard.expiry': [/expiration/i, /date.d.expiration/i, /expire/i],
    iban: [/iban/i],

    // Temporal
    date: [/date/i],
  },
  placeholder: {
    email: [/entrez.*(votre)?.*email/i, /votre.*email/i, /adresse.*email/i],
    phone: [/entrez.*(votre)?.*téléphone/i, /numéro.*téléphone/i],
    fullName: [/votre.nom/i, /nom.complet/i],
    username: [/votre.*identifiant/i, /nom.d.utilisateur/i],
    password: [/votre.*mot.de.passe/i, /entrez.*mot.de.passe/i],
    company: [/nom.*entreprise/i, /votre.*entreprise/i],
    website: [/https?:\/\//i, /www\./i, /votre.*site/i],
    'address.line2': [/appartement/i, /bâtiment/i, /étage/i],
    state: [/région/i, /province/i],
    birthDate: [/jj\/mm\/aaaa/i, /date.*naissance/i],
    bio: [/parlez.*de.vous/i, /courte.*bio/i],
  },
  label: {
    email: [/email/i, /courriel/i],
    phone: [/téléphone/i, /tél/i],
    fullName: [/nom/i, /prénom/i],
    'name.given': [/prénom/i],
    'name.family': [/nom de famille/i],
    middleName: [/deuxième prénom/i],
    username: [/identifiant/i, /nom d'utilisateur/i],
    password: [/mot de passe/i],
    confirmPassword: [/confirmer.*mot de passe/i],
    company: [/entreprise/i, /société/i],
    jobTitle: [/poste/i, /fonction/i],
    website: [/site web/i],
    'address.line2': [/complément d'adresse/i, /apt/i],
    state: [/région/i, /province/i],
    'creditCard.number': [/numéro de carte/i],
    'creditCard.cvv': [/cvv/i, /cryptogramme/i],
    'creditCard.expiry': [/expiration/i],
    birthDate: [/date de naissance/i, /anniversaire/i],
    age: [/âge/i],
    gender: [/genre/i, /sexe/i],
    bio: [/bio/i, /à propos/i],
  },
};
