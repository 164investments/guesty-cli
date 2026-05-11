# Geocode Location by Full Address

Converts the full address into latitude and longitude coordinates and populates individual address fields.

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
    "/address/geocode": {
      "post": {
        "operationId": "AddressController_geocodeAddress",
        "summary": "Geocode Location by Full Address",
        "description": "Converts the full address into latitude and longitude coordinates and populates individual address fields.",
        "tags": [
          "Address"
        ],
        "parameters": [],
        "requestBody": {
          "required": true,
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
                      }
                    },
                    "example": {
                      "full": "30-19 32nd St, Long Island City, NY 11102, USA"
                    }
                  },
                  "publishedAddress": {
                    "type": "object",
                    "properties": {
                      "full": {
                        "type": "string"
                      }
                    },
                    "example": {
                      "full": "30-19 32nd St, Long Island City, NY 11102, USA"
                    }
                  }
                },
                "required": [
                  "address",
                  "publishedAddress"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Return geocoded addresses.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "address": {
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
                        }
                      }
                    },
                    "publishedAddress": {
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
                        }
                      }
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