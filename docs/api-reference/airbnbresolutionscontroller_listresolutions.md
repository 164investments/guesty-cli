# List closed airbnb resolutions for reservation

List closed airbnb resolutions for reservation.

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
      "name": "Airbnb Resolution Center"
    }
  ],
  "paths": {
    "/airbnb-resolutions-center/reservations/{guestyReservationId}/resolutions": {
      "get": {
        "operationId": "AirbnbResolutionsController_listResolutions",
        "summary": "List closed airbnb resolutions for reservation",
        "description": "List closed airbnb resolutions for reservation.",
        "parameters": [
          {
            "name": "from",
            "required": true,
            "in": "query",
            "description": "Created at from",
            "schema": {
              "example": "2023-11-27T12:00:00Z",
              "type": "string"
            }
          },
          {
            "name": "to",
            "required": true,
            "in": "query",
            "description": "Created at to",
            "schema": {
              "example": "2023-11-27T15:00:00Z",
              "type": "string"
            }
          },
          {
            "name": "guestyReservationId",
            "required": true,
            "in": "path",
            "description": "Reservation id in Guesty",
            "schema": {
              "example": "6525198fd60018000e7d6602",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Closed resolutions and amounts summaries"
          },
          "400": {
            "description": "The params provided are invalid."
          }
        },
        "tags": [
          "Airbnb Resolution Center"
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