# Get a specific contact

Retrieves a specific contact by its unique ID.

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
      "name": "Phone Book Entries"
    }
  ],
  "paths": {
    "/contacts/{contactId}": {
      "get": {
        "operationId": "OpenApiContactsController_findOne",
        "summary": "Get a specific contact",
        "description": "Retrieves a specific contact by its unique ID.",
        "parameters": [
          {
            "name": "contactId",
            "required": true,
            "in": "path",
            "description": "The ID of the contact to retrieve.",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "fields",
            "required": false,
            "in": "query",
            "description": "Comma-separated list of fields to include in the response.",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Contact retrieved successfully.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "_id": {
                      "type": "string",
                      "description": "Contact ID",
                      "example": "60d21b4667d0d8992e610c85"
                    },
                    "accountId": {
                      "type": "string",
                      "description": "Account ID",
                      "example": "5a5786a0c526211500d261d9"
                    },
                    "fullName": {
                      "type": "string",
                      "description": "Full name of the contact",
                      "example": "John Doe"
                    },
                    "firstName": {
                      "type": "string",
                      "description": "First name of the contact",
                      "example": "John"
                    },
                    "lastName": {
                      "type": "string",
                      "description": "Last name of the contact",
                      "example": "Doe"
                    },
                    "nickname": {
                      "type": "string",
                      "description": "Nickname of the contact",
                      "example": "Johnny"
                    },
                    "title": {
                      "type": "string",
                      "description": "Title of the contact (e.g. Dr., Mr., Mrs.)",
                      "example": "Mr."
                    },
                    "company": {
                      "type": "string",
                      "description": "Company name",
                      "example": "Acme Inc."
                    },
                    "picture": {
                      "description": "Contact pictures",
                      "example": {
                        "thumbnail": "https://example.com/thumbnail.jpg",
                        "regular": "https://example.com/regular.jpg",
                        "large": "https://example.com/large.jpg"
                      },
                      "allOf": [
                        {
                          "type": "object",
                          "properties": {
                            "thumbnail": {
                              "type": "string",
                              "description": "Thumbnail URL of the picture"
                            },
                            "regular": {
                              "type": "string",
                              "description": "Regular size URL of the picture"
                            },
                            "large": {
                              "type": "string",
                              "description": "Large size URL of the picture"
                            }
                          }
                        }
                      ]
                    },
                    "emails": {
                      "description": "List of email addresses",
                      "example": [
                        "john.doe@example.com",
                        "johndoe@company.com"
                      ],
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "phones": {
                      "description": "List of phone numbers",
                      "example": [
                        "+1234567890",
                        "+9876543210"
                      ],
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "preferredContactMethod": {
                      "type": "string",
                      "description": "Preferred contact method",
                      "example": "email"
                    },
                    "email": {
                      "type": "string",
                      "description": "Primary email address",
                      "example": "john.doe@example.com"
                    },
                    "phone": {
                      "type": "string",
                      "description": "Primary phone number",
                      "example": "+1234567890"
                    },
                    "notes": {
                      "type": "string",
                      "description": "Additional notes about the contact",
                      "example": "Test contact note"
                    }
                  },
                  "required": [
                    "_id",
                    "accountId",
                    "fullName"
                  ]
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized."
          },
          "403": {
            "description": "Forbidden."
          },
          "404": {
            "description": "Contact not found."
          }
        },
        "tags": [
          "Phone Book Entries"
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