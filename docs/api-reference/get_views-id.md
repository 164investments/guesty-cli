# Retrieve a view

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
      "name": "Views"
    }
  ],
  "paths": {
    "/views/{id}": {
      "get": {
        "tags": [
          "Views"
        ],
        "summary": "Retrieve a view",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "description": "View ID",
            "required": true,
            "example": "5fa02fa358d2db673e17bc2d",
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "query",
            "name": "fields",
            "description": "Selection of fields, separated by space",
            "required": false,
            "example": "title address",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "View object",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "_id": {
                      "type": "string",
                      "description": "Unique id"
                    },
                    "accountId": {
                      "type": "string",
                      "description": "Id of the user owning this view"
                    },
                    "title": {
                      "type": "string",
                      "description": "Title for the view"
                    },
                    "filters": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "field": {
                            "type": "string",
                            "description": "Subject of the filter"
                          },
                          "operator": {
                            "type": "string",
                            "description": "Enhanced MongoDB comparison operator: $eq, $not, $contains, $notcontains, $gt, $lt, $between"
                          },
                          "value": {
                            "type": "string",
                            "description": "Value to filter by."
                          },
                          "context": {
                            "type": "string",
                            "default": null,
                            "description": "Optional preprocessing. Options are now, createdAt, confirmedAt, canceledAt, alteredAt. When given, the date in value is relative to the context."
                          }
                        },
                        "required": [
                          "field",
                          "operator",
                          "value"
                        ]
                      }
                    },
                    "fields": {
                      "type": "string",
                      "description": "Selection of fields, separated by space"
                    },
                    "sort": {
                      "type": "string",
                      "description": "ascending sort , use - to descending sort"
                    },
                    "createdAt": {
                      "type": "string"
                    },
                    "updatedAt": {
                      "type": "string"
                    },
                    "scheduledEmails": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "days": {
                            "type": "array",
                            "description": "Array of numbers 0-6, number per day",
                            "example": "4 (send on Thursday)"
                          },
                          "recipient": {
                            "type": "string",
                            "description": "Emails separated by comma"
                          },
                          "hour": {
                            "type": "number",
                            "description": "when the report should be sent"
                          }
                        },
                        "required": [
                          "hour"
                        ]
                      }
                    },
                    "shares": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "contactId": {
                            "type": "string",
                            "description": "Required Contact ID to share with",
                            "example": "5926bdfb1bfe871000d0a745"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
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