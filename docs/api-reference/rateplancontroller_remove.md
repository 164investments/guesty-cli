# Remove a Rate Plan

Deletes an existing rate plan. 

 Currently in pilot, the Rate Plans API allows the creation and management of independent rate plans that are not visible or editable within the Guesty UI. This API is available exclusively for <a href="http://Booking.com">Booking.com</a>   and direct reservations. 

To participate in the pilot, customers should contact Guesty for an eligibility review and to receive detailed information on potential limitations and risks.

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
      "name": "Open Api Rate Plan CRUD v1"
    }
  ],
  "paths": {
    "/rm-rate-plans-ext/rate-plans/{ratePlanId}": {
      "delete": {
        "operationId": "RatePlanController_remove",
        "summary": "Remove a Rate Plan",
        "description": "Deletes an existing rate plan. \n\n Currently in pilot, the Rate Plans API allows the creation and management of independent rate plans that are not visible or editable within the Guesty UI. This API is available exclusively for <a href=\"http://Booking.com\">Booking.com</a>   and direct reservations. \n\nTo participate in the pilot, customers should contact Guesty for an eligibility review and to receive detailed information on potential limitations and risks.",
        "parameters": [
          {
            "name": "ratePlanId",
            "required": true,
            "in": "path",
            "description": "The rate plan ID.",
            "example": "62d7d58327dba40034e9670e",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": "Success"
          },
          "401": {
            "description": "Client unauthorized"
          },
          "403": {
            "description": "Access is forbidden for this client"
          },
          "404": {
            "description": "Not found",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "object",
                      "default": {
                        "code": "RATE_PLAN_NOT_FOUND",
                        "data": "RatePlan not found",
                        "message": "Not Found",
                        "status": 404
                      }
                    }
                  },
                  "required": [
                    "error"
                  ]
                }
              }
            }
          },
          "500": {
            "description": "Internal server error"
          }
        },
        "tags": [
          "Open Api Rate Plan CRUD v1"
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