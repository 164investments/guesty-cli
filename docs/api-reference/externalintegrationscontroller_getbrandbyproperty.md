# Get brand by property_id.

Http endpoint to retrieve brandings by property id.

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
      "name": "Account Brands"
    }
  ],
  "paths": {
    "/account-brands/properties/{propertyId}": {
      "get": {
        "operationId": "ExternalIntegrationsController_getBrandByProperty",
        "summary": "Get brand by property_id.",
        "description": "Http endpoint to retrieve brandings by property id.",
        "tags": [
          "Account Brands"
        ],
        "parameters": [
          {
            "name": "propertyId",
            "required": true,
            "in": "path",
            "description": "Property(listing) Id.",
            "schema": {
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
                    "propertyBrand": {
                      "nullable": true,
                      "allOf": [
                        {
                          "type": "object",
                          "properties": {
                            "id": {
                              "type": "string"
                            },
                            "name": {
                              "type": "string"
                            },
                            "logoUrl": {
                              "type": "string"
                            },
                            "currency": {
                              "type": "string"
                            },
                            "phoneNumber": {
                              "type": "string"
                            },
                            "address": {
                              "type": "object"
                            },
                            "email": {
                              "type": "string"
                            },
                            "accountId": {
                              "type": "string"
                            },
                            "vatNum": {
                              "type": "string"
                            },
                            "createdAt": {
                              "format": "date-time",
                              "type": "string"
                            },
                            "updatedAt": {
                              "format": "date-time",
                              "type": "string"
                            }
                          },
                          "required": [
                            "id",
                            "name",
                            "logoUrl",
                            "address",
                            "email",
                            "accountId",
                            "createdAt",
                            "updatedAt"
                          ]
                        }
                      ]
                    },
                    "default": {
                      "nullable": true,
                      "allOf": [
                        {
                          "type": "object",
                          "properties": {
                            "id": {
                              "type": "string"
                            },
                            "name": {
                              "type": "string"
                            },
                            "logoUrl": {
                              "type": "string"
                            },
                            "currency": {
                              "type": "string"
                            },
                            "phoneNumber": {
                              "type": "string"
                            },
                            "address": {
                              "type": "object"
                            },
                            "email": {
                              "type": "string"
                            },
                            "accountId": {
                              "type": "string"
                            },
                            "vatNum": {
                              "type": "string"
                            },
                            "createdAt": {
                              "format": "date-time",
                              "type": "string"
                            },
                            "updatedAt": {
                              "format": "date-time",
                              "type": "string"
                            }
                          },
                          "required": [
                            "id",
                            "name",
                            "logoUrl",
                            "address",
                            "email",
                            "accountId",
                            "createdAt",
                            "updatedAt"
                          ]
                        }
                      ]
                    }
                  },
                  "required": [
                    "propertyBrand",
                    "default"
                  ]
                }
              }
            }
          },
          "500": {
            "description": "API error.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {}
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