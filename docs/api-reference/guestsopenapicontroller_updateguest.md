# Update guest

Update guest

# OpenAPI definition

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "GUESTY OPEN API",
    "description": "Guesty Open API documentation",
    "version": "1"
  },
  "servers": [
    {
      "url": "https://open-api.guesty.com/v1"
    }
  ],
  "security": [
    {
      "bearerAuth": []
    }
  ],
  "tags": [
    {
      "name": "Guests"
    }
  ],
  "paths": {
    "/guests-crud/{guestId}": {
      "put": {
        "operationId": "GuestsOpenApiController_updateGuest",
        "summary": "Update guest",
        "tags": [
          "Guests"
        ],
        "description": "Update guest",
        "parameters": [
          {
            "name": "guestId",
            "required": true,
            "in": "path",
            "description": "Guest id",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "firstName": {
                    "type": "string"
                  },
                  "lastName": {
                    "type": "string"
                  },
                  "hometown": {
                    "type": "string"
                  },
                  "address": {
                    "type": "object",
                    "properties": {
                      "street": {
                        "type": "string",
                        "description": "The street address, including the house number and street name. It can also be a PO Box",
                        "example": "1000 5th Ave"
                      },
                      "zipCode": {
                        "type": "string",
                        "description": "The postal code or ZIP code of the address",
                        "example": "10028"
                      },
                      "state": {
                        "type": "string",
                        "description": "The state or province name",
                        "example": "New York"
                      },
                      "city": {
                        "type": "string",
                        "description": "The name of the city/town/village",
                        "example": "New York"
                      },
                      "country": {
                        "type": "string",
                        "description": "The [full name](https://www.iban.com/country-codes) of the country",
                        "example": "United States"
                      },
                      "countryCode": {
                        "type": "string",
                        "description": "The two-letter [ISO 3166 Alpha-2](https://www.iban.com/country-codes) country code",
                        "example": "US"
                      }
                    }
                  },
                  "picture": {
                    "type": "object",
                    "description": "A link to guest’s picture in different sizes"
                  },
                  "email": {
                    "type": "string",
                    "description": "The main contact email of the guest"
                  },
                  "emails": {
                    "description": "List of additional emails of the guest",
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "phone": {
                    "type": "string",
                    "description": "The main contact phone number"
                  },
                  "phones": {
                    "description": "List of additional phone numbers of the guest",
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "notes": {
                    "type": "string",
                    "description": "Attention notes about the guest, describing important pieces of information about the guest, to review for all reservations (e.g. “Requires accessibility equipment”). Displayed as “Attention notes” in the user interface."
                  },
                  "tags": {
                    "type": "array",
                    "items": {
                      "type": "string",
                      "enum": [
                        "vip",
                        "friendsAndFamily",
                        "staff",
                        "management",
                        "blocklisted",
                        "loyaltyProgram"
                      ]
                    },
                    "description": "Tags for describing the guest at a glance + show the enum for the field to show the allowed options"
                  },
                  "goodToKnowNotes": {
                    "type": "string",
                    "description": "“Good to know” notes about the guest. Notes to help capture facts about the guest that will help the team to personalize the guest’s stays (e.g. “Big football fan”)"
                  },
                  "preferredLanguage": {
                    "enum": [
                      "en",
                      "es",
                      "fr",
                      "ma",
                      "aa",
                      "ab",
                      "ae",
                      "af",
                      "ak",
                      "am",
                      "an",
                      "ar",
                      "as",
                      "av",
                      "ay",
                      "az",
                      "ba",
                      "be",
                      "bg",
                      "bh",
                      "bi",
                      "bm",
                      "bn",
                      "bo",
                      "br",
                      "bs",
                      "ca",
                      "ce",
                      "ch",
                      "co",
                      "cr",
                      "cs",
                      "cu",
                      "cv",
                      "cy",
                      "da",
                      "de",
                      "dv",
                      "dz",
                      "ee",
                      "el",
                      "eo",
                      "et",
                      "eu",
                      "fa",
                      "ff",
                      "fi",
                      "fj",
                      "fo",
                      "fy",
                      "ga",
                      "gd",
                      "gl",
                      "gn",
                      "gu",
                      "gv",
                      "ha",
                      "he",
                      "hi",
                      "ho",
                      "hr",
                      "ht",
                      "hu",
                      "hy",
                      "hz",
                      "ia",
                      "id",
                      "ie",
                      "ig",
                      "ii",
                      "ik",
                      "io",
                      "is",
                      "it",
                      "iu",
                      "ja",
                      "jv",
                      "ka",
                      "kg",
                      "ki",
                      "kj",
                      "kk",
                      "kl",
                      "km",
                      "kn",
                      "ko",
                      "kr",
                      "ks",
                      "ku",
                      "kv",
                      "kw",
                      "ky",
                      "la",
                      "lb",
                      "lg",
                      "li",
                      "ln",
                      "lo",
                      "lt",
                      "lu",
                      "lv",
                      "mg",
                      "mh",
                      "mi",
                      "mk",
                      "ml",
                      "mn",
                      "mr",
                      "ms",
                      "mt",
                      "my",
                      "na",
                      "nb",
                      "nd",
                      "ne",
                      "ng",
                      "nl",
                      "nn",
                      "no",
                      "nr",
                      "nv",
                      "ny",
                      "oc",
                      "oj",
                      "om",
                      "or",
                      "os",
                      "pa",
                      "pi",
                      "pl",
                      "ps",
                      "pt",
                      "qu",
                      "rm",
                      "rn",
                      "ro",
                      "ru",
                      "rw",
                      "sa",
                      "sc",
                      "sd",
                      "se",
                      "sg",
                      "si",
                      "sk",
                      "sl",
                      "sm",
                      "sn",
                      "so",
                      "sq",
                      "sr",
                      "ss",
                      "st",
                      "su",
                      "sv",
                      "sw",
                      "ta",
                      "te",
                      "tg",
                      "th",
                      "ti",
                      "tk",
                      "tl",
                      "tn",
                      "to",
                      "tr",
                      "ts",
                      "tt",
                      "tw",
                      "ty",
                      "ug",
                      "uk",
                      "ur",
                      "uz",
                      "ve",
                      "vi",
                      "vo",
                      "wa",
                      "wo",
                      "xh",
                      "yi",
                      "yo",
                      "za",
                      "zh",
                      "zu"
                    ],
                    "type": "string"
                  },
                  "birthday": {
                    "format": "date-time",
                    "type": "string"
                  },
                  "gender": {
                    "enum": [
                      "male",
                      "female",
                      "other"
                    ],
                    "type": "string"
                  },
                  "maritalStatus": {
                    "enum": [
                      "single",
                      "married",
                      "widowed",
                      "separated",
                      "divorced"
                    ],
                    "type": "string"
                  },
                  "dietaryPreferences": {
                    "description": "You can pick one of the predefined options, or create a new one for your account",
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "allergies": {
                    "description": "You can pick one of the predefined options, or create a new one for your account",
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "interests": {
                    "description": "You can pick one of the predefined options, or create a new one for your account",
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "pronouns": {
                    "enum": [
                      "he/him/his",
                      "she/her/hers",
                      "they/them/their",
                      "xe/xem/xyr"
                    ],
                    "type": "string"
                  },
                  "kids": {
                    "type": "number",
                    "minimum": 0
                  },
                  "passportNumber": {
                    "type": "string",
                    "maxLength": 50
                  },
                  "identityNumber": {
                    "type": "string",
                    "maxLength": 50,
                    "description": "Identity Card Number"
                  },
                  "nationality": {
                    "enum": [
                      "af",
                      "ax",
                      "al",
                      "dz",
                      "as",
                      "ad",
                      "ao",
                      "ai",
                      "aq",
                      "ag",
                      "ar",
                      "am",
                      "aw",
                      "au",
                      "at",
                      "az",
                      "bs",
                      "bh",
                      "bd",
                      "bb",
                      "by",
                      "be",
                      "bz",
                      "bj",
                      "bm",
                      "bt",
                      "bo",
                      "bq",
                      "ba",
                      "bw",
                      "bv",
                      "br",
                      "io",
                      "bn",
                      "bg",
                      "bf",
                      "bi",
                      "kh",
                      "cm",
                      "ca",
                      "cv",
                      "ky",
                      "cf",
                      "td",
                      "cl",
                      "cn",
                      "cx",
                      "cc",
                      "co",
                      "km",
                      "cg",
                      "cd",
                      "ck",
                      "cr",
                      "ci",
                      "hr",
                      "cu",
                      "cw",
                      "cy",
                      "cz",
                      "dk",
                      "dj",
                      "dm",
                      "do",
                      "ec",
                      "eg",
                      "sv",
                      "gq",
                      "er",
                      "ee",
                      "et",
                      "fk",
                      "fo",
                      "fj",
                      "fi",
                      "fr",
                      "gf",
                      "pf",
                      "tf",
                      "ga",
                      "gm",
                      "ge",
                      "de",
                      "gh",
                      "gi",
                      "gr",
                      "gl",
                      "gd",
                      "gp",
                      "gu",
                      "gt",
                      "gg",
                      "gn",
                      "gw",
                      "gy",
                      "ht",
                      "hm",
                      "va",
                      "hn",
                      "hk",
                      "hu",
                      "is",
                      "in",
                      "id",
                      "ir",
                      "iq",
                      "ie",
                      "im",
                      "il",
                      "it",
                      "jm",
                      "jp",
                      "je",
                      "jo",
                      "kz",
                      "ke",
                      "ki",
                      "kp",
                      "kr",
                      "xk",
                      "kw",
                      "kg",
                      "la",
                      "lv",
                      "lb",
                      "ls",
                      "lr",
                      "ly",
                      "li",
                      "lt",
                      "lu",
                      "mo",
                      "mk",
                      "mg",
                      "mw",
                      "my",
                      "mv",
                      "ml",
                      "mt",
                      "mh",
                      "mq",
                      "mr",
                      "mu",
                      "yt",
                      "mx",
                      "fm",
                      "md",
                      "mc",
                      "mn",
                      "me",
                      "ms",
                      "ma",
                      "mz",
                      "mm",
                      "na",
                      "nr",
                      "np",
                      "nl",
                      "an",
                      "nc",
                      "nz",
                      "ni",
                      "ne",
                      "ng",
                      "nu",
                      "nf",
                      "mp",
                      "no",
                      "om",
                      "pk",
                      "pw",
                      "ps",
                      "pa",
                      "pg",
                      "py",
                      "pe",
                      "ph",
                      "pn",
                      "pl",
                      "pt",
                      "pr",
                      "qa",
                      "re",
                      "ro",
                      "ru",
                      "rw",
                      "bl",
                      "sh",
                      "kn",
                      "lc",
                      "mf",
                      "pm",
                      "vc",
                      "ws",
                      "sm",
                      "st",
                      "sa",
                      "sn",
                      "rs",
                      "cs",
                      "sc",
                      "sl",
                      "sg",
                      "sx",
                      "sk",
                      "si",
                      "sb",
                      "so",
                      "za",
                      "gs",
                      "ss",
                      "es",
                      "lk",
                      "sd",
                      "sr",
                      "sj",
                      "sz",
                      "se",
                      "ch",
                      "sy",
                      "tw",
                      "tj",
                      "tz",
                      "th",
                      "tl",
                      "tg",
                      "tk",
                      "to",
                      "tt",
                      "tn",
                      "tr",
                      "tm",
                      "tc",
                      "tv",
                      "ug",
                      "ua",
                      "ae",
                      "gb",
                      "us",
                      "um",
                      "uy",
                      "uz",
                      "vu",
                      "ve",
                      "vn",
                      "vg",
                      "vi",
                      "wf",
                      "eh",
                      "ye",
                      "zm",
                      "zw"
                    ],
                    "type": "string"
                  },
                  "otaLinks": {
                    "description": "A link to the guest’s profile on an OTA",
                    "example": [
                      {
                        "type": "airbnb",
                        "url": "https://www.airbnb.com"
                      }
                    ],
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "type": {
                          "enum": [
                            "airbnb"
                          ],
                          "type": "string"
                        },
                        "url": {
                          "type": "string",
                          "enum": [
                            "https://www.airbnb.com"
                          ],
                          "description": "The url must include “https://” prefix"
                        }
                      }
                    }
                  }
                },
                "required": [
                  "tags"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "The guest has been successfully updated.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "_id": {
                      "type": "string",
                      "example": "5e17287629e111001f7d3f4d"
                    },
                    "firstName": {
                      "type": "string",
                      "example": "Rick"
                    },
                    "lastName": {
                      "type": "string",
                      "example": "Sanchez"
                    },
                    "fullName": {
                      "type": "string",
                      "example": "Rick Sanchez"
                    },
                    "hometown": {
                      "type": "string",
                      "example": "New York"
                    },
                    "createdAt": {
                      "format": "date-time",
                      "type": "string",
                      "example": "2022-08-12T16:00:00.000+03:00"
                    },
                    "address": {
                      "type": "object",
                      "example": {
                        "street": "1000 5th Ave",
                        "city": "New York",
                        "country": "United States",
                        "countryCode": "US",
                        "zipCode": "10028",
                        "state": "New York"
                      }
                    },
                    "picture": {
                      "type": "object",
                      "description": "A link to guest’s picture in different sizes",
                      "example": {
                        "thumbnail": "//guestybookings.s3.amazonaws.com/guests/thumbnail_e2cb8a96-45a9-45cd-b28e-57e1ca1fc988.jpg",
                        "large": "//guestybookings.s3.amazonaws.com/guests/large_e2cb8a96-45a9-45cd-b28e-57e1ca1fc988.jpg",
                        "regular": "//guestybookings.s3.amazonaws.com/guests/regular_e2cb8a96-45a9-45cd-b28e-57e1ca1fc988.jpg"
                      }
                    },
                    "email": {
                      "type": "string",
                      "description": "The main contact email of the guest",
                      "example": "email@email.com"
                    },
                    "emails": {
                      "description": "List of additional emails of the guest",
                      "example": [
                        "email@email.com",
                        "email2@email.com"
                      ],
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "phone": {
                      "type": "string",
                      "description": "The main contact phone number",
                      "example": "972234567454"
                    },
                    "phones": {
                      "description": "List of additional phone numbers of the guest",
                      "example": [
                        "972234567454",
                        "972234567890"
                      ],
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "notes": {
                      "type": "string",
                      "description": "Attention notes about the guest, describing important pieces of information about the guest, to review for all reservations (e.g. “Requires accessibility equipment”)",
                      "example": "This guest is rich"
                    },
                    "tags": {
                      "description": "Tags for describing the guest at a glance + show the enum for the field to show the allowed options",
                      "example": [
                        "blocklisted",
                        "VIP"
                      ],
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "goodToKnowNotes": {
                      "type": "string",
                      "description": "“Good to know” notes about the guest. Notes to help capture facts about the guest that will help the team to personalize the guest’s stays (e.g. “Big football fan”)",
                      "example": "This guest is alleric to peanuts"
                    },
                    "preferredLanguage": {
                      "type": "string",
                      "example": [
                        "en",
                        "es",
                        "fr"
                      ]
                    },
                    "birthday": {
                      "format": "date-time",
                      "type": "string",
                      "example": "2017-08-12T16:00:00.000+03:00"
                    },
                    "gender": {
                      "type": "string",
                      "example": "2017-08-12T16:00:00.000+03:00"
                    },
                    "maritalStatus": {
                      "type": "string",
                      "example": "single"
                    },
                    "dietaryPreferences": {
                      "description": "You can pick one of the predefined options, or create a new one for your account",
                      "example": [
                        "vegan",
                        "veggies"
                      ],
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "allergies": {
                      "description": "You can pick one of the predefined options, or create a new one for your account",
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "interests": {
                      "example": [
                        "sports"
                      ],
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "pronouns": {
                      "type": "string",
                      "example": "he/him/his"
                    },
                    "otaLinks": {
                      "description": "A link to the guest’s profile on an OTA",
                      "example": [
                        {
                          "type": "airbnb",
                          "url": "https://www.airbnb.com"
                        }
                      ],
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "type": {
                            "enum": [
                              "airbnb"
                            ],
                            "type": "string"
                          },
                          "url": {
                            "type": "string",
                            "enum": [
                              "https://www.airbnb.com"
                            ],
                            "description": "The url must include “https://” prefix"
                          }
                        }
                      }
                    },
                    "kids": {
                      "type": "number",
                      "minimum": 0,
                      "example": 3
                    },
                    "passportNumber": {
                      "type": "string",
                      "maxLength": 50,
                      "example": "23424353"
                    },
                    "identityNumber": {
                      "type": "string",
                      "maxLength": 50,
                      "example": "324325121"
                    },
                    "nationality": {
                      "type": "string",
                      "example": "il"
                    },
                    "contactType": {
                      "type": "string",
                      "example": "guest"
                    },
                    "airbnb2": {
                      "type": "object",
                      "example": {
                        "index": "index",
                        "id": 4246064595217,
                        "url": "https://www.airbnb.com",
                        "firstName": "Rick"
                      }
                    },
                    "rentalsUnited": {
                      "type": "object",
                      "example": {
                        "firstName": "Rick",
                        "lastName": "Sanchez",
                        "fullName": "Rick Sanchez",
                        "failedPaymentMethod": "failed payment method"
                      }
                    },
                    "bookingCom": {
                      "type": "object",
                      "example": {
                        "firstName": "Rick",
                        "lastName": "Sanchez",
                        "fullName": "Rick Sanchez",
                        "url": "https://www.booking.com"
                      }
                    },
                    "homeAway": {
                      "type": "object",
                      "example": {
                        "title": "title",
                        "firstName": "Rick",
                        "lastName": "Sanchez",
                        "fullName": "Rick Sanchez",
                        "url": "https://www.homeaway.com"
                      }
                    },
                    "tripAdvisor": {
                      "type": "object",
                      "example": {
                        "title": "title",
                        "firstName": "Rick",
                        "lastName": "Sanchez",
                        "fullName": "Rick Sanchez",
                        "proxyEmail": "proxyemail@email.com",
                        "url": "https://www.tripadvisor.com"
                      }
                    },
                    "policy": {
                      "type": "object",
                      "example": {
                        "marketing": {
                          "isAccepted": false,
                          "dateOfAcceptance": null
                        },
                        "privacyObject": {
                          "isAccepted": false,
                          "dateOfAcceptance": null,
                          "versionNumber": "ffewfewgw"
                        }
                      }
                    },
                    "returningGuest": {
                      "type": "boolean"
                    }
                  },
                  "required": [
                    "_id",
                    "firstName",
                    "lastName",
                    "returningGuest"
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Can not update guest, unauthorized"
          }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "apiKey",
        "name": "authorization",
        "in": "header"
      }
    }
  }
}
```