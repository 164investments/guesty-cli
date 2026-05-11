# Create user

Create a new user. After creation, please use "Assign roles" endpoint to grant roles to the user, and "Assign scope" endpoint to assign a scope of permitted properties.

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
      "name": "Users"
    }
  ],
  "paths": {
    "/users": {
      "post": {
        "operationId": "createUser",
        "summary": "Create user",
        "description": "Create a new user. After creation, please use \"Assign roles\" endpoint to grant roles to the user, and \"Assign scope\" endpoint to assign a scope of permitted properties.",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "email": {
                    "type": "string"
                  },
                  "emails": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "firstName": {
                    "type": "string"
                  },
                  "lastName": {
                    "type": "string"
                  },
                  "title": {
                    "type": "string"
                  },
                  "timezone": {
                    "type": "string"
                  },
                  "picture": {
                    "type": "object",
                    "properties": {
                      "thumbnail": {
                        "type": "string",
                        "example": "https://thumbnail.url.com"
                      },
                      "regular": {
                        "type": "string",
                        "example": "https://regular.url.com"
                      },
                      "large": {
                        "type": "string",
                        "example": "https://large.url.com"
                      }
                    },
                    "required": [
                      "thumbnail",
                      "regular",
                      "large"
                    ]
                  },
                  "tags": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "phone": {
                    "type": "string"
                  },
                  "phones": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "preferredContactMethod": {
                    "type": "string"
                  },
                  "noteBeforeContacting": {
                    "type": "string"
                  },
                  "notes": {
                    "type": "string"
                  },
                  "customerType": {
                    "enum": [
                      "lite",
                      "pro"
                    ],
                    "type": "string"
                  },
                  "favs": {
                    "type": "object",
                    "properties": {
                      "views": {
                        "type": "array",
                        "items": {
                          "type": "string"
                        }
                      }
                    },
                    "required": [
                      "views"
                    ]
                  },
                  "displayLanguage": {
                    "type": "string"
                  },
                  "settings": {
                    "type": "object",
                    "properties": {
                      "notifications": {
                        "description": "Notification settings",
                        "allOf": [
                          {
                            "type": "object",
                            "properties": {
                              "subscriptions": {
                                "type": "array",
                                "items": {
                                  "type": "object",
                                  "properties": {
                                    "type": {
                                      "type": "string",
                                      "enum": [
                                        "PAYMENT",
                                        "RESERVATION",
                                        "TASK",
                                        "GENERAL",
                                        "NIGHTS_LIMIT",
                                        "PROPERTY"
                                      ],
                                      "example": "PAYMENT"
                                    },
                                    "name": {
                                      "type": "string",
                                      "example": "FAILED"
                                    },
                                    "targets": {
                                      "type": "array",
                                      "example": [
                                        "DASHBOARD"
                                      ],
                                      "items": {
                                        "type": "string",
                                        "enum": [
                                          "EMAIL",
                                          "SMS",
                                          "DASHBOARD"
                                        ]
                                      }
                                    }
                                  },
                                  "required": [
                                    "type",
                                    "name",
                                    "targets"
                                  ]
                                }
                              }
                            },
                            "required": [
                              "subscriptions"
                            ]
                          }
                        ]
                      }
                    }
                  },
                  "registrationType": {
                    "type": "string"
                  },
                  "registrationOrigin": {
                    "type": "string",
                    "enum": [
                      "SALESFORCE"
                    ]
                  },
                  "country": {
                    "type": "string",
                    "description": "Country code (ISO 2-letter). Undefined by default unless set by user.",
                    "example": "US",
                    "enum": [
                      "AF",
                      "AX",
                      "AL",
                      "DZ",
                      "AS",
                      "AD",
                      "AO",
                      "AI",
                      "AQ",
                      "AG",
                      "AR",
                      "AM",
                      "AW",
                      "AU",
                      "AT",
                      "AZ",
                      "BH",
                      "BS",
                      "BD",
                      "BB",
                      "BY",
                      "BE",
                      "BZ",
                      "BJ",
                      "BM",
                      "BT",
                      "BO",
                      "BQ",
                      "BA",
                      "BW",
                      "BV",
                      "BR",
                      "IO",
                      "BN",
                      "BG",
                      "BF",
                      "BI",
                      "KH",
                      "CM",
                      "CA",
                      "CV",
                      "KY",
                      "CF",
                      "TD",
                      "CL",
                      "CN",
                      "CX",
                      "CC",
                      "CO",
                      "KM",
                      "CG",
                      "CD",
                      "CK",
                      "CR",
                      "CI",
                      "HR",
                      "CU",
                      "CW",
                      "CY",
                      "CZ",
                      "DK",
                      "DJ",
                      "DM",
                      "DO",
                      "EC",
                      "EG",
                      "SV",
                      "GQ",
                      "ER",
                      "EE",
                      "ET",
                      "FK",
                      "FO",
                      "FJ",
                      "FI",
                      "FR",
                      "GF",
                      "PF",
                      "TF",
                      "GA",
                      "GM",
                      "GE",
                      "DE",
                      "GH",
                      "GI",
                      "GR",
                      "GL",
                      "GD",
                      "GP",
                      "GU",
                      "GT",
                      "GG",
                      "GN",
                      "GW",
                      "GY",
                      "HT",
                      "HM",
                      "VA",
                      "HN",
                      "HK",
                      "HU",
                      "IS",
                      "IN",
                      "ID",
                      "IR",
                      "IQ",
                      "IE",
                      "IM",
                      "IL",
                      "IT",
                      "JM",
                      "JP",
                      "JE",
                      "JO",
                      "KZ",
                      "KE",
                      "KI",
                      "KP",
                      "KR",
                      "KW",
                      "KG",
                      "LA",
                      "LV",
                      "LB",
                      "LS",
                      "LR",
                      "LY",
                      "LI",
                      "LT",
                      "LU",
                      "MO",
                      "MK",
                      "MG",
                      "MW",
                      "MY",
                      "MV",
                      "ML",
                      "MT",
                      "MH",
                      "MQ",
                      "MR",
                      "MU",
                      "YT",
                      "MX",
                      "FM",
                      "MD",
                      "MC",
                      "MN",
                      "ME",
                      "MS",
                      "MA",
                      "MZ",
                      "MM",
                      "NA",
                      "NR",
                      "NP",
                      "NL",
                      "NC",
                      "NZ",
                      "NI",
                      "NE",
                      "NG",
                      "NU",
                      "NF",
                      "MP",
                      "NO",
                      "OM",
                      "PK",
                      "PW",
                      "PS",
                      "PA",
                      "PG",
                      "PY",
                      "PE",
                      "PH",
                      "PN",
                      "PL",
                      "PT",
                      "PR",
                      "QA",
                      "RE",
                      "RO",
                      "RU",
                      "RW",
                      "BL",
                      "SH",
                      "KN",
                      "LC",
                      "MF",
                      "PM",
                      "VC",
                      "WS",
                      "SM",
                      "ST",
                      "SA",
                      "SN",
                      "RS",
                      "SC",
                      "SL",
                      "SG",
                      "SX",
                      "SK",
                      "SI",
                      "SB",
                      "SO",
                      "ZA",
                      "GS",
                      "SS",
                      "ES",
                      "LK",
                      "SD",
                      "SR",
                      "SJ",
                      "SZ",
                      "SE",
                      "CH",
                      "SY",
                      "TW",
                      "TJ",
                      "TZ",
                      "TH",
                      "TL",
                      "TG",
                      "TK",
                      "TO",
                      "TT",
                      "TN",
                      "TR",
                      "TM",
                      "TC",
                      "TV",
                      "UG",
                      "UA",
                      "AE",
                      "GB",
                      "US",
                      "UM",
                      "UY",
                      "UZ",
                      "VU",
                      "VE",
                      "VN",
                      "VG",
                      "VI",
                      "WF",
                      "EH",
                      "YE",
                      "ZM",
                      "ZW"
                    ]
                  },
                  "roles": {
                    "deprecated": true,
                    "description": "Deprecated: please follow the instructions in [the description](#/Users/createUser) for more details about the role assignment workflow.",
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "roleId": {
                          "type": "string",
                          "enum": [
                            "57447a900ebc04ba98064035",
                            "58db6932ea2a13ea9f4855a5",
                            "578b52a6dddfe2b1d0781b0e",
                            "578b52a6dddfe2b1d0781b0f",
                            "578b52a6dddfe2b1d0781b12",
                            "578b52a6dddfe2b1d0781b10",
                            "578b52a6dddfe2b1d0781b11",
                            "57c2d040cf6c3fed6a4d1775",
                            "58db693fea2a13ea9f4855aa",
                            "579e1769cf6c3fed6a3f6b1a",
                            "5e567a850ba1fb0244146fc0",
                            "5e57b0826b4440002a603a93",
                            "60d1b0fb396b25993e756e63",
                            "5cf7846e02d9171c4e4b1698"
                          ],
                          "example": "579e1769cf6c3fed6a3f6b1a",
                          "description": "Role ID:\n\n* `58db6932ea2a13ea9f4855a5` - Account manager\n\n* `578b52a6dddfe2b1d0781b0e` - Listing Viewer\n\n* `578b52a6dddfe2b1d0781b0f` - Calendar Availability Control\n\n* `578b52a6dddfe2b1d0781b12` - Listing Admin\n\n* `578b52a6dddfe2b1d0781b10` - Calendar Full Control\n\n* `578b52a6dddfe2b1d0781b11` - Listing's Financials\n\n* `57447a900ebc04ba98064035` - Account admin\n\n* `57c2d040cf6c3fed6a4d1775` - Integration Manager\n\n* `58db693fea2a13ea9f4855aa` - Viewer\n\n* `579e1769cf6c3fed6a3f6b1a` - Listing Manager\n\n* `5e567a850ba1fb0244146fc0` - Calendar Viewer\n\n* `5e57b0826b4440002a603a93` - Communication Agent\n\n* `60d1b0fb396b25993e756e63` - Revenue Manager"
                        },
                        "listingIds": {
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        }
                      },
                      "required": [
                        "roleId"
                      ]
                    }
                  }
                },
                "required": [
                  "email",
                  "firstName",
                  "lastName"
                ]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Success response",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "_id": {
                      "type": "string",
                      "example": "611d02b7c9c54b01736ae01d",
                      "description": "User MongoDB _id"
                    },
                    "accountId": {
                      "type": "string",
                      "example": "611cf837c9c54b01736ae01c",
                      "description": "Your account ID"
                    },
                    "email": {
                      "type": "string",
                      "example": "example@email.com"
                    },
                    "emails": {
                      "example": [
                        "example@email.com"
                      ],
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "firstName": {
                      "type": "string",
                      "example": "John"
                    },
                    "userStartedUpdateEmailFlow": {
                      "type": "boolean"
                    },
                    "lastName": {
                      "type": "string",
                      "example": "Boe"
                    },
                    "fullName": {
                      "type": "string",
                      "example": "John Boe"
                    },
                    "title": {
                      "type": "string",
                      "example": "CTO"
                    },
                    "timezone": {
                      "type": "string",
                      "example": "Europe/Zurich"
                    },
                    "picture": {
                      "type": "object",
                      "properties": {
                        "thumbnail": {
                          "type": "string",
                          "example": "https://thumbnail.url.com"
                        },
                        "regular": {
                          "type": "string",
                          "example": "https://regular.url.com"
                        },
                        "large": {
                          "type": "string",
                          "example": "https://large.url.com"
                        }
                      },
                      "required": [
                        "thumbnail",
                        "regular",
                        "large"
                      ]
                    },
                    "tags": {
                      "example": [
                        "tag1"
                      ],
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "lastActivityTime": {
                      "type": "number"
                    },
                    "phone": {
                      "type": "string"
                    },
                    "phones": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "preferredContactMethod": {
                      "type": "string"
                    },
                    "noteBeforeContacting": {
                      "type": "string"
                    },
                    "notes": {
                      "type": "string"
                    },
                    "favs": {
                      "type": "object",
                      "properties": {
                        "views": {
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        }
                      },
                      "required": [
                        "views"
                      ]
                    },
                    "displayLanguage": {
                      "type": "string"
                    },
                    "settings": {
                      "type": "object",
                      "properties": {
                        "notifications": {
                          "description": "Notification settings",
                          "allOf": [
                            {
                              "type": "object",
                              "properties": {
                                "subscriptions": {
                                  "type": "array",
                                  "items": {
                                    "type": "object",
                                    "properties": {
                                      "type": {
                                        "type": "string",
                                        "enum": [
                                          "PAYMENT",
                                          "RESERVATION",
                                          "TASK",
                                          "GENERAL",
                                          "NIGHTS_LIMIT",
                                          "PROPERTY"
                                        ],
                                        "example": "PAYMENT"
                                      },
                                      "name": {
                                        "type": "string",
                                        "example": "FAILED"
                                      },
                                      "targets": {
                                        "type": "array",
                                        "example": [
                                          "DASHBOARD"
                                        ],
                                        "items": {
                                          "type": "string",
                                          "enum": [
                                            "EMAIL",
                                            "SMS",
                                            "DASHBOARD"
                                          ]
                                        }
                                      }
                                    },
                                    "required": [
                                      "type",
                                      "name",
                                      "targets"
                                    ]
                                  }
                                }
                              },
                              "required": [
                                "subscriptions"
                              ]
                            }
                          ]
                        }
                      }
                    },
                    "roles": {
                      "deprecated": true,
                      "description": "Deprecated: Roles field is optional and may not be present for users created in the new flow.",
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "roleId": {
                            "type": "string",
                            "description": "Role ID:\n\n* `58db6932ea2a13ea9f4855a5` - Account manager\n\n* `578b52a6dddfe2b1d0781b0e` - Listing Viewer\n\n* `578b52a6dddfe2b1d0781b0f` - Calendar Availability Control\n\n* `578b52a6dddfe2b1d0781b12` - Listing Admin\n\n* `578b52a6dddfe2b1d0781b10` - Calendar Full Control\n\n* `578b52a6dddfe2b1d0781b11` - Listing's Financials\n\n* `57447a900ebc04ba98064035` - Account admin\n\n* `57c2d040cf6c3fed6a4d1775` - Integration Manager\n\n* `58db693fea2a13ea9f4855aa` - Viewer\n\n* `579e1769cf6c3fed6a3f6b1a` - Listing Manager\n\n* `5e567a850ba1fb0244146fc0` - Calendar Viewer\n\n* `5e57b0826b4440002a603a93` - Communication Agent\n\n* `60d1b0fb396b25993e756e63` - Revenue Manager"
                          },
                          "listingIds": {
                            "type": "array",
                            "items": {
                              "type": "string"
                            }
                          }
                        },
                        "required": [
                          "roleId"
                        ]
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "message": {
                          "type": "string",
                          "example": "Bad Request"
                        },
                        "code": {
                          "type": "string",
                          "example": "VALIDATION_FAILED"
                        },
                        "status": {
                          "type": "number",
                          "example": 400
                        },
                        "data": {
                          "example": [
                            "property1 must not be less than 0",
                            "property1 must be an integer number"
                          ],
                          "type": "array",
                          "items": {
                            "type": "string"
                          }
                        }
                      },
                      "required": [
                        "message",
                        "code",
                        "status",
                        "data"
                      ]
                    }
                  },
                  "required": [
                    "error"
                  ]
                }
              }
            }
          }
        },
        "tags": [
          "Users"
        ]
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