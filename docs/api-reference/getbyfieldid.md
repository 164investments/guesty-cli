# Get Custom Field from Selected Property

Retrieve a specific custom field for a select property using the custom field ID.

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
      "name": "Custom Fields"
    }
  ],
  "paths": {
    "/properties-api/custom-fields/{propertyId}/{fieldId}": {
      "get": {
        "operationId": "getByFieldId",
        "summary": "Get Custom Field from Selected Property",
        "description": "Retrieve a specific custom field for a select property using the custom field ID.",
        "tags": [
          "Custom Fields"
        ],
        "parameters": [
          {
            "name": "propertyId",
            "required": true,
            "in": "path",
            "description": "The Guesty property ID.",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "fieldId",
            "required": true,
            "in": "path",
            "description": "The custom field ID.",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Returns the custom fields set on the specified property.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "propertyId": {
                      "type": "string"
                    },
                    "fieldId": {
                      "type": "string"
                    },
                    "value": {
                      "type": "string"
                    },
                    "fullText": {
                      "type": "string",
                      "description": "If the value is a long text, the response will return a truncated version, and the complete text will be stored successfully."
                    },
                    "displayName": {
                      "type": "string"
                    },
                    "key": {
                      "type": "string"
                    },
                    "type": {
                      "type": "string"
                    },
                    "options": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "object": {
                      "type": "string",
                      "description": "Custom field type"
                    },
                    "isPublic": {
                      "type": "boolean"
                    }
                  },
                  "example": {
                    "propertyId": "5aa90b5a23f67f001f4115b6",
                    "fieldId": "5bf14ff5163f2e0037331fe1",
                    "displayName": "Some Field",
                    "key": "test",
                    "type": "text",
                    "options": [
                      "value 1",
                      "value 2"
                    ],
                    "isPublic": true,
                    "value": "value 1"
                  }
                }
              }
            }
          },
          "403": {
            "description": "Unauthorized Request.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "example": "UNAUTHORIZED"
                        },
                        "message": {
                          "type": "string",
                          "example": "Unauthorized"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Property not found.",
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
                          "example": "Property not found"
                        },
                        "status": {
                          "type": "integer",
                          "example": 404
                        }
                      }
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