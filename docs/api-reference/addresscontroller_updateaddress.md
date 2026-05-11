# Update Property Address

Edit the address of a given property. If it is a multi-unit, all sub-units will be updated too.

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
    "/address/{id}/update": {
      "put": {
        "operationId": "AddressController_updateAddress",
        "summary": "Update Property Address",
        "description": "Edit the address of a given property. If it is a multi-unit, all sub-units will be updated too.",
        "tags": [
          "Address"
        ],
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "The Guesty ID of the property for which you would like to edit the address. If it is a multi-unit parent, all sub-units will be updated too.",
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
                  "address": {
                    "type": "object",
                    "properties": {
                      "full": {
                        "type": "string",
                        "example": "30-19 32nd St, Long Island City, NY 11102, USA"
                      },
                      "apartment": {
                        "type": "string",
                        "example": "4d"
                      },
                      "city": {
                        "type": "string",
                        "example": "New York City"
                      },
                      "country": {
                        "type": "string",
                        "example": "United States"
                      },
                      "county": {
                        "type": "string",
                        "example": "Nassau County"
                      },
                      "floor": {
                        "type": "string",
                        "example": "1D"
                      },
                      "unitNumber": {
                        "type": "string",
                        "example": "30a"
                      },
                      "location": {
                        "type": "object",
                        "properties": {
                          "lat": {
                            "type": "number",
                            "example": 40.7659021
                          },
                          "lng": {
                            "type": "number",
                            "example": -73.9208235
                          }
                        }
                      },
                      "neighborhood": {
                        "type": "string",
                        "example": "Astoria"
                      },
                      "searchable": {
                        "type": "string",
                        "example": "30-19 32nd St, Long Island City, NY 11102, USA"
                      },
                      "state": {
                        "type": "string",
                        "example": "New York"
                      },
                      "street": {
                        "type": "string",
                        "example": "32nd Street"
                      },
                      "zipcode": {
                        "type": "string",
                        "example": "11102"
                      },
                      "buildingName": {
                        "type": "string",
                        "example": "Metropolis campus"
                      }
                    },
                    "required": [
                      "location"
                    ]
                  },
                  "publishedAddress": {
                    "type": "object",
                    "properties": {
                      "full": {
                        "type": "string",
                        "example": "30-19 32nd St, Long Island City, NY 11102, USA"
                      },
                      "apartment": {
                        "type": "string",
                        "example": "4d"
                      },
                      "city": {
                        "type": "string",
                        "example": "New York City"
                      },
                      "country": {
                        "type": "string",
                        "example": "United States"
                      },
                      "county": {
                        "type": "string",
                        "example": "Nassau County"
                      },
                      "floor": {
                        "type": "string",
                        "example": "1D"
                      },
                      "unitNumber": {
                        "type": "string",
                        "example": "30a"
                      },
                      "location": {
                        "type": "object",
                        "properties": {
                          "lat": {
                            "type": "number",
                            "example": 40.7659021
                          },
                          "lng": {
                            "type": "number",
                            "example": -73.9208235
                          }
                        }
                      },
                      "neighborhood": {
                        "type": "string",
                        "example": "Astoria"
                      },
                      "searchable": {
                        "type": "string",
                        "example": "30-19 32nd St, Long Island City, NY 11102, USA"
                      },
                      "state": {
                        "type": "string",
                        "example": "New York"
                      },
                      "street": {
                        "type": "string",
                        "example": "32nd Street"
                      },
                      "zipcode": {
                        "type": "string",
                        "example": "11102"
                      },
                      "buildingName": {
                        "type": "string",
                        "example": "Metropolis campus"
                      }
                    },
                    "required": [
                      "location"
                    ]
                  },
                  "isPublishedAddressEnabled": {
                    "type": "boolean",
                    "example": true
                  }
                },
                "required": [
                  "address",
                  "publishedAddress",
                  "isPublishedAddressEnabled"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Return updated addresses.",
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