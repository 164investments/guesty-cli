# Set Amenities For Property

Set selected amenities list to the property

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
      "name": "Amenities"
    }
  ],
  "paths": {
    "/properties-api/amenities/{propertyId}": {
      "put": {
        "operationId": "AmenitiesController_setAmenitiesForProperty",
        "summary": "Set Amenities For Property",
        "description": "Set selected amenities list to the property",
        "tags": [
          "Amenities"
        ],
        "parameters": [
          {
            "name": "propertyId",
            "required": true,
            "in": "path",
            "description": "The id of the property to set amenities to",
            "schema": {
              "type": "string",
              "example": "5b2149c9f579400024388c47"
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
                  "amenities": {
                    "description": "An array containing supported amenities to set to the property",
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  }
                },
                "required": [
                  "amenities"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Return the updated list of amenities assigned to specific property",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "propertyId": {
                      "type": "string"
                    },
                    "amenities": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "description": "An array containing amenities supported by guesty and assigned to the property after the operation"
                    },
                    "otherAmenities": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      },
                      "description": "An array containing all other amenities assigned to the property after the operation"
                    }
                  },
                  "example": {
                    "propertyId": "645774fe76e5da340bf915e7",
                    "amenities": [
                      "Shampoo",
                      "Piano"
                    ],
                    "otherAmenities": [
                      "Red wine"
                    ]
                  }
                }
              }
            }
          },
          "400": {
            "description": "Only MTL and SINGLE property types are supported",
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
                          "example": "Only MTL and SINGLE property types are supported"
                        },
                        "status": {
                          "type": "integer",
                          "example": 400
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "403": {
            "description": "Unauthorized Request",
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
            "description": "Unit type not found",
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
                          "example": "Not Found"
                        },
                        "status": {
                          "type": "integer",
                          "example": 404
                        },
                        "data": {
                          "type": "string",
                          "example": "Amenities not found"
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