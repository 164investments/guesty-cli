# Retrieve Property Address

Get the listing address of the given property.

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
      "name": "Address"
    }
  ],
  "paths": {
    "/address/{id}": {
      "get": {
        "operationId": "AddressController_getAddress",
        "summary": "Retrieve Property Address",
        "description": "Get the listing address of the given property.",
        "tags": [
          "Address"
        ],
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "The Guesty ID of the property for which you would like to retrieve the address.",
            "schema": {
              "type": "string",
              "example": "5b2149c9f579400024388c47"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Return the address object.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "address": {
                      "type": "object",
                      "properties": {
                        "full": {
                          "type": "string"
                        },
                        "city": {
                          "type": "string"
                        },
                        "country": {
                          "type": "string"
                        },
                        "location": {
                          "type": "object",
                          "properties": {
                            "lat": {
                              "type": "number"
                            },
                            "lng": {
                              "type": "number"
                            }
                          }
                        },
                        "state": {
                          "type": "string"
                        },
                        "street": {
                          "type": "string"
                        },
                        "zipcode": {
                          "type": "string"
                        },
                        "apartment": {
                          "type": "string"
                        },
                        "county": {
                          "type": "string"
                        },
                        "floor": {
                          "type": "string"
                        },
                        "unitNumber": {
                          "type": "string"
                        },
                        "neighborhood": {
                          "type": "string"
                        },
                        "searchable": {
                          "type": "string"
                        },
                        "buildingName": {
                          "type": "string"
                        }
                      },
                      "description": "Address object configuration."
                    },
                    "publishedAddress": {
                      "type": "object",
                      "properties": {
                        "full": {
                          "type": "string"
                        },
                        "city": {
                          "type": "string"
                        },
                        "country": {
                          "type": "string"
                        },
                        "location": {
                          "type": "object",
                          "properties": {
                            "lat": {
                              "type": "number"
                            },
                            "lng": {
                              "type": "number"
                            }
                          }
                        },
                        "state": {
                          "type": "string"
                        },
                        "street": {
                          "type": "string"
                        },
                        "zipcode": {
                          "type": "string"
                        },
                        "apartment": {
                          "type": "string"
                        },
                        "county": {
                          "type": "string"
                        },
                        "floor": {
                          "type": "string"
                        },
                        "unitNumber": {
                          "type": "string"
                        },
                        "neighborhood": {
                          "type": "string"
                        },
                        "searchable": {
                          "type": "string"
                        },
                        "buildingName": {
                          "type": "string"
                        }
                      },
                      "description": "Address object configuration."
                    },
                    "isPublishedAddressEnabled": {
                      "type": "boolean"
                    }
                  },
                  "example": {
                    "address": {
                      "full": "30-19 32nd St, Long Island City, NY 11102, USA",
                      "street": "32nd Street",
                      "city": "New York",
                      "country": "United States",
                      "state": "New York",
                      "location": {
                        "lat": 40.7659021,
                        "lng": -73.9208235
                      },
                      "zipcode": 11102
                    },
                    "publishedAddress": {
                      "full": "30-19 32nd St, Long Island City, NY 11102, USA",
                      "street": "32nd Street",
                      "city": "New York",
                      "country": "United States",
                      "state": "New York",
                      "location": {
                        "lat": 40.7659021,
                        "lng": -73.9208235
                      },
                      "zipcode": 11102
                    },
                    "isPublishedAddressEnabled": true
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
            "description": "Address not found.",
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
                          "example": "Address not found"
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