# Add upsell fee to inquiry rate plans quotes [Beta]

Add upsell fee to inquiry rate plans quotes. Add upsell fee id multiple times if you want to add the same upsell fee multiple times. To remove the upsell fee exclude the ID from an array [Beta]

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
      "name": "AdditionalFees"
    }
  ],
  "paths": {
    "/additional-fees/inquiries/{inquiryId}/upsells": {
      "post": {
        "tags": [
          "AdditionalFees"
        ],
        "summary": "Add upsell fee to inquiry rate plans quotes [Beta]",
        "description": "Add upsell fee to inquiry rate plans quotes. Add upsell fee id multiple times if you want to add the same upsell fee multiple times. To remove the upsell fee exclude the ID from an array [Beta]",
        "parameters": [
          {
            "in": "path",
            "name": "inquiryId",
            "description": "Inquiry id",
            "required": true,
            "example": "6697817a90212b000e24375a",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "description": "Request payload",
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "ratePlanIds": {
                    "type": "array",
                    "description": "Inquiry rate plan IDs to add upsell to the quote of each of them",
                    "items": {
                      "type": "string",
                      "description": "Inquiry rate plan id"
                    }
                  },
                  "additionalFeeIds": {
                    "type": "array",
                    "description": "Additional fee ids. Add ID multiple times if you want to add the same upsell fee multiple times. To remove the upsell fee exclude the ID from an array",
                    "items": {
                      "type": "string",
                      "description": "Additional fee id"
                    }
                  }
                },
                "required": [
                  "additionalFeeIds"
                ]
              },
              "example": {
                "ratePlanIds": [
                  "6697b104831bfa39c5bacfc4"
                ],
                "additionalFeeIds": [
                  "668bc9f9afa7b3000cbe34c9",
                  "668bc9f9afa7b3000cbe34c9",
                  "668bc9f9afa7b3000cbe34c9",
                  "668cf62e6a3556000dfc3aa5",
                  "668cf65f6a3556000dfc3aa6"
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Inquiry with rate plans with quotes with added upsell fees in invoice items",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "description": "Inquiry with rate plans with quotes with added upsell fees in invoice items"
                },
                "examples": {
                  "Inquiry with rate plans with quotes with added upsell fees in invoice items": {
                    "description": "Inquiry with rate plans with quotes with added upsell fees in invoice items",
                    "value": {}
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid input"
          },
          "404": {
            "description": "Not found"
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