# Get a List of All Supported Amenities

Get a list of all supported amenities, including their names, groups and channels

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
    "/properties-api/amenities/supported": {
      "get": {
        "operationId": "getSupportedAmenities",
        "summary": "Get a List of All Supported Amenities",
        "description": "Get a list of all supported amenities, including their names, groups and channels",
        "tags": [
          "Amenities"
        ],
        "parameters": [],
        "responses": {
          "200": {
            "description": "A list of all supported amenities",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "name": {
                        "type": "string",
                        "description": "The name of the amenity",
                        "example": "Elevator"
                      },
                      "group": {
                        "type": "string",
                        "description": "The name of the amenity group that it belongs to",
                        "example": "Accessibility"
                      },
                      "channels": {
                        "type": "object",
                        "description": "An array of channels as key, and their values on the channels",
                        "example": {
                          "airbnb2": "elevator",
                          "bookingCom": "5132",
                          "homeaway2": "AMENITIES_ELEVATOR",
                          "rentalsUnited": "689",
                          "tripAdvisor": "ELEVATOR_IN_BUILDING"
                        }
                      }
                    }
                  },
                  "example": [
                    {
                      "name": "Elevator",
                      "group": "Accessibility",
                      "channels": {
                        "airbnb2": "elevator",
                        "bookingCom": "5132",
                        "homeaway2": "AMENITIES_ELEVATOR",
                        "rentalsUnited": "689",
                        "tripAdvisor": "ELEVATOR_IN_BUILDING"
                      }
                    },
                    {
                      "name": "Gym",
                      "group": "Wellness",
                      "channels": {
                        "airbnb2": "gym"
                      }
                    }
                  ]
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