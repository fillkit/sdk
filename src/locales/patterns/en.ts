import type { MultilingualPatterns } from '../index.js';

export const en: MultilingualPatterns = {
  name: {
    // Contact
    email: [/email/i, /e-mail/i, /mail/i],
    phone: [/phone/i, /tel/i, /mobile/i, /cell/i],
    username: [/username/i, /user.?name/i, /login/i, /handle/i],
    password: [/password/i, /passwd/i, /pass/i],
    confirmPassword: [
      /confirm.?password/i,
      /password.?confirm/i,
      /re.?password/i,
    ],
    website: [/website/i, /homepage/i, /url/i, /web/i],

    // Personal
    fullName: [/name/i, /fullname/i, /full.name/i],
    'name.given': [/first.?name/i, /given.?name/i, /fname/i],
    'name.family': [/last.?name/i, /family.?name/i, /surname/i, /lname/i],
    middleName: [/middle.?name/i, /mname/i],
    'name.prefix': [/prefix/i, /title/i, /salutation/i],
    'name.suffix': [/suffix/i],
    gender: [/gender/i, /sex/i],
    birthDate: [/birth.?date/i, /dob/i, /date.?of.?birth/i, /birthday/i],
    age: [/^age$/i],
    bio: [/bio/i, /about/i, /description/i],
    ssn: [/ssn/i, /social.?security/i],

    // Business
    company: [/company/i, /organization/i, /employer/i, /business/i],
    jobTitle: [/job.?title/i, /position/i, /occupation/i, /role/i],
    department: [/department/i, /division/i, /dept/i],

    // Location
    'address.line1': [/address/i, /street/i],
    'address.line2': [
      /address.?2/i,
      /address.?line.?2/i,
      /apt/i,
      /suite/i,
      /unit/i,
    ],
    city: [/city/i, /town/i],
    state: [/state/i, /province/i, /region/i],
    postalCode: [/postal/i, /zip/i, /postcode/i],
    country: [/country/i, /nation/i],

    // Financial
    'creditCard.number': [/card.?number/i, /credit.?card/i, /cc.?num/i],
    'creditCard.cvv': [/cvv/i, /cvc/i, /csc/i, /security.?code/i],
    'creditCard.expiry': [/expir/i, /exp.?date/i],
    iban: [/iban/i],

    // Temporal
    date: [/date/i],
  },
  placeholder: {
    email: [/enter.?(your)?.*email/i, /email.?address/i],
    phone: [/enter.?(your)?.*phone/i, /phone.?number/i],
    fullName: [/your.?name/i, /full.?name/i],
    username: [/enter.*username/i, /your.*username/i],
    password: [/enter.*password/i, /your.*password/i],
    company: [/company.*name/i, /your.*company/i],
    website: [/https?:\/\//i, /www\./i, /your.*website/i],
    'address.line2': [/apartment/i, /suite/i, /unit/i],
    state: [/state/i, /province/i],
    birthDate: [/mm\/dd\/yyyy/i, /date.*birth/i],
    bio: [/tell.*about.*yourself/i, /short.*bio/i],
  },
  label: {
    email: [/email/i, /e-mail/i],
    phone: [/phone/i, /telephone/i, /mobile/i],
    fullName: [/name/i],
    'name.given': [/first name/i],
    'name.family': [/last name/i],
    middleName: [/middle name/i],
    username: [/username/i],
    password: [/password/i],
    confirmPassword: [/confirm password/i, /re-enter password/i],
    company: [/company/i, /organization/i],
    jobTitle: [/job title/i, /position/i],
    website: [/website/i],
    'address.line2': [/address line 2/i, /apt\/suite/i],
    state: [/state/i, /province/i],
    'creditCard.number': [/card number/i],
    'creditCard.cvv': [/cvv/i, /security code/i],
    'creditCard.expiry': [/expiration/i, /expiry/i],
    birthDate: [/date of birth/i, /birthday/i],
    age: [/age/i],
    gender: [/gender/i],
    bio: [/bio/i, /about/i],
  },
};
