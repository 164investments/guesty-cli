# Update custom field

# OpenAPI definition

````json
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
      "name": "Accounts"
    }
  ],
  "paths": {
    "/accounts/{id}/custom-fields": {
      "put": {
        "tags": [
          "Accounts"
        ],
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "summary": "Update custom field",
        "requestBody": {
          "description": "Custom Field. IMPORTANT NOTE: The only field editable is 'options' on (on custom filed ```type:enum```) type Custom Fields. The whole object need to be sent",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "customFields": {
                    "type": "array",
                    "description": "**IMPORTANT NOTE:**\nThe oroginal object should be sent,\n **The only field editable is 'options' for 'enum' customFiled type**",
                    "items": {
                      "allOf": [
                        {
                          "description": "Use when createing *options* customField: ```type:enum```\n This case required options arry in edition",
                          "type": "object",
                          "required": [
                            "isPublic",
                            "key",
                            "object",
                            "options",
                            "type"
                          ],
                          "properties": {
                            "isPublic": {
                              "type": "boolean"
                            },
                            "key": {
                              "type": "string"
                            },
                            "object": {
                              "type": "string",
                              "enum": [
                                "listing",
                                "reservation"
                              ]
                            },
                            "options": {
                              "type": "array",
                              "items": {
                                "type": "string"
                              }
                            },
                            "type": {
                              "type": "string",
                              "enum": [
                                "enum"
                              ]
                            }
                          }
                        },
                        {
                          "required": [
                            "fieldId"
                          ],
                          "properties": {
                            "fieldId": {
                              "type": "string"
                            }
                          }
                        }
                      ]
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Custom Fields Array",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "id": {
                        "type": "string"
                      },
                      "displayName": {
                        "type": "string"
                      },
                      "isPublic": {
                        "type": "boolean"
                      },
                      "key": {
                        "type": "string"
                      },
                      "object": {
                        "type": "string",
                        "enum": [
                          "listing",
                          "reservation"
                        ]
                      },
                      "options": {
                        "type": "array",
                        "items": {
                          "type": "string"
                        }
                      },
                      "type": {
                        "type": "string",
                        "enum": [
                          "user",
                          "boolean",
                          "enum",
                          "longtext",
                          "date",
                          "text",
                          "time",
                          "contact",
                          "number"
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
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
````