# Delete Custom Field from property

Delete a specific custom field value from property

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
      "delete": {
        "operationId": "delete",
        "summary": "Delete Custom Field from property",
        "description": "Delete a specific custom field value from property",
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
          },
          {
            "name": "updateSubUnits",
            "required": false,
            "in": "query",
            "description": "Should also update MultiUnit SubUnits (if applicable)? False by default.",
            "schema": {
              "default": false,
              "type": "boolean"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Returns a list of all custom fields set on property",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "propertyId": {
                      "type": "string"
                    },
                    "customFields": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
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
                          "customFields": [
                            {
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
                            },
                            {
                              "fieldId": "5b5ed0e7e359ca0040894648",
                              "displayName": "Do I?",
                              "key": "doi",
                              "type": "boolean",
                              "options": [],
                              "isPublic": true,
                              "value": "true"
                            },
                            {
                              "fieldId": "5b1e5e4317b4b9002afab4bd",
                              "displayName": "How to access WiFI?",
                              "key": "wifi_access",
                              "type": "longtext",
                              "options": [],
                              "isPublic": true,
                              "value": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque eu venenatis risus. Phasellus ...",
                              "fullText": "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa.\n\nCum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate"
                            }
                          ]
                        }
                      },
                      "description": "An array containing a list of custom fields"
                    }
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