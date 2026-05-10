# List all contacts

Retrieves a paginated list of all contacts for the authenticated user's account.

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
    "/contacts": {
      "get": {
        "operationId": "OpenApiContactsController_findAll",
        "summary": "List all contacts",
        "description": "Retrieves a paginated list of all contacts for the authenticated user's account.",
        "parameters": [
          {
            "name": "q",
            "required": false,
            "in": "query",
            "description": "Search term for fullName, emails, or phones",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "fields",
            "required": false,
            "in": "query",
            "description": "Fields to include in the response",
            "schema": {
              "default": "",
              "type": "string"
            }
          },
          {
            "name": "sort",
            "required": false,
            "in": "query",
            "description": "Field to sort by, e.g., \"fullName\"",
            "schema": {
              "default": "fullName",
              "type": "string"
            }
          },
          {
            "name": "skip",
            "required": false,
            "in": "query",
            "description": "Number of records to skip",
            "schema": {
              "minimum": 0,
              "default": 0,
              "type": "number"
            }
          },
          {
            "name": "limit",
            "required": false,
            "in": "query",
            "description": "Number of records to return",
            "schema": {
              "minimum": 1,
              "maximum": 400,
              "default": 200,
              "type": "number"
            }
          },
          {
            "name": "ids",
            "required": false,
            "in": "query",
            "description": "Limit results to these ids (can be provided as comma-separated string or as multiple values)",
            "schema": {
              "oneOf": [
                {
                  "type": "string",
                  "example": "507f1f77bcf86cd799439011,507f191e810c19729de860ea"
                },
                {
                  "type": "array",
                  "items": {
                    "type": "string"
                  },
                  "example": [
                    "507f1f77bcf86cd799439011",
                    "507f191e810c19729de860ea"
                  ]
                }
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of contacts retrieved successfully.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "results": {
                      "description": "List of contacts",
                      "example": [
                        {
                          "_id": "60d21b4667d0d8992e610c85",
                          "accountId": "5a5786a0c526211500d261d9",
                          "fullName": "John Doe",
                          "email": "john.doe@example.com",
                          "phone": "+1234567890"
                        }
                      ],
                      "type": "array",
                      "items": {
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
                    },
                    "count": {
                      "type": "number",
                      "description": "Total number of contacts matching the query",
                      "example": 1
                    },
                    "fields": {
                      "type": "string",
                      "description": "Fields included in the response",
                      "example": "fullName email phone"
                    },
                    "limit": {
                      "type": "number",
                      "description": "Number of records to return",
                      "example": 200
                    },
                    "skip": {
                      "type": "number",
                      "description": "Number of records to skip",
                      "example": 0
                    }
                  },
                  "required": [
                    "results",
                    "count",
                    "fields",
                    "limit",
                    "skip"
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