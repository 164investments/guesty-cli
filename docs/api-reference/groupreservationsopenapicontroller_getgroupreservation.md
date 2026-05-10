# Get group reservation by group id

Get group reservation by group id, including it's sub reservations (up to 25 sub reservations)

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
      "name": "Group Reservations Open Api [Beta]"
    }
  ],
  "paths": {
    "/reservations-v3/group/{groupId}": {
      "get": {
        "operationId": "GroupReservationsOpenAPIController_getGroupReservation",
        "summary": "Get group reservation by group id",
        "description": "Get group reservation by group id, including it's sub reservations (up to 25 sub reservations)",
        "parameters": [
          {
            "name": "groupId",
            "required": true,
            "in": "path",
            "description": "The ID of the group reservation to fetch",
            "schema": {
              "example": "5f92cbf10cf217478ba93561",
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "The group reservation has been successfully fetched",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "groupReservation": {
                      "type": "object"
                    },
                    "subReservations": {
                      "type": "object"
                    }
                  },
                  "required": [
                    "groupReservation",
                    "subReservations"
                  ]
                }
              }
            }
          },
          "404": {
            "description": "Group reservation wasnt found."
          }
        },
        "tags": [
          "Group Reservations Open Api [Beta]"
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