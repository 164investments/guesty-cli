# Get user

Get a user by ID.

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
    "/users/{id}": {
      "get": {
        "operationId": "OpenApiUsersHttpController_getUserById",
        "summary": "Get user",
        "description": "Get a user by ID.",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "The unique identifier of the user.",
            "schema": {
              "example": "611d02b7c9c54b01736ae01d",
              "type": "string"
            }
          },
          {
            "name": "fields",
            "required": false,
            "in": "query",
            "description": "Selection of fields, separated by space",
            "schema": {
              "default": "",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
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