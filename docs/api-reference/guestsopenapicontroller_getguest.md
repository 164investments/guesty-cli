# Get guest by id

Get guest by id

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
      "get": {
        "operationId": "GuestsOpenApiController_getGuest",
        "summary": "Get guest by id",
        "tags": [
          "Guests"
        ],
        "description": "Get guest by id",
        "parameters": [
          {
            "name": "guestId",
            "required": true,
            "in": "path",
            "description": "Guest id",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "fields",
            "required": true,
            "in": "query",
            "description": "Fields",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "The guest has been successfully pulled.",
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
            "description": "Can not pull guest, unauthorized"
          },
          "404": {
            "description": "Guest not found"
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