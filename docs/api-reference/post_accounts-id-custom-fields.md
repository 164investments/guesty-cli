# Create new custom field

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
      "post": {
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
            },
            "description": "e.g. - Account id"
          }
        ],
        "summary": "Create new custom field",
        "requestBody": {
          "description": "Custom Fields Array: all new fields",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "customFields": {
                    "type": "array",
                    "description": "Custom Fields Array: all new fields",
                    "items": {
                      "oneOf": [
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
                          "type": "object",
                          "required": [
                            "isPublic",
                            "key",
                            "object",
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
                            "type": {
                              "type": "string",
                              "enum": [
                                "user",
                                "boolean",
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