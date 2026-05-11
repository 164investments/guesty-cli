# Update webhook

Update a webhook

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
      "name": "Webhooks"
    }
  ],
  "paths": {
    "/webhooks/{id}": {
      "put": {
        "tags": [
          "Webhooks"
        ],
        "summary": "Update webhook",
        "description": "Update a webhook",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "description": "Webhook ID",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "url": {
                    "type": "string",
                    "example": "https://www.hookurl.com"
                  },
                  "events": {
                    "type": "array",
                    "description": "add list of event to register for the provided url",
                    "enum": [
                      "guest.created",
                      "guest.deleted",
                      "guest.updated",
                      "listing.new",
                      "listing.updated",
                      "listing.removed",
                      "listing.calendar.updated",
                      "calendar.updated.v2",
                      "payments.failed",
                      "reservation.messageReceived",
                      "reservation.new",
                      "reservation.updated",
                      "reservation.created.v2",
                      "reservation.updated.v2",
                      "reservation.messageSent",
                      "task.created",
                      "task.deleted",
                      "task.updated",
                      "reservation_update_shortlist",
                      "payments.method.received"
                    ],
                    "items": {
                      "type": "string",
                      "enum": [
                        "guest.created",
                        "guest.deleted",
                        "guest.updated",
                        "listing.new",
                        "listing.updated",
                        "listing.removed",
                        "listing.calendar.updated",
                        "calendar.updated.v2",
                        "payments.failed",
                        "reservation.messageReceived",
                        "reservation.new",
                        "reservation.updated",
                        "reservation.created.v2",
                        "reservation.updated.v2",
                        "reservation.messageSent",
                        "task.created",
                        "task.deleted",
                        "task.updated",
                        "reservation_update_shortlist",
                        "payments.method.received"
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
            "description": "The updated webhook object",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "allOf": [
                      {
                        "type": "object",
                        "properties": {
                          "accountId": {
                            "type": "string",
                            "example": "563e0b6a08a2710e00057b82",
                            "description": "Unique Id"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "properties": {
                          "_id": {
                            "type": "string",
                            "example": "563e0b6a08a2710e00057b82",
                            "description": "Unique Id"
                          }
                        }
                      },
                      {
                        "type": "object",
                        "properties": {
                          "url": {
                            "type": "string",
                            "example": "https://www.hookurl.com"
                          },
                          "events": {
                            "type": "array",
                            "description": "add list of event to register for the provided url",
                            "enum": [
                              "guest.created",
                              "guest.deleted",
                              "guest.updated",
                              "listing.new",
                              "listing.updated",
                              "listing.removed",
                              "listing.calendar.updated",
                              "calendar.updated.v2",
                              "payments.failed",
                              "reservation.messageReceived",
                              "reservation.new",
                              "reservation.updated",
                              "reservation.created.v2",
                              "reservation.updated.v2",
                              "reservation.messageSent",
                              "task.created",
                              "task.deleted",
                              "task.updated",
                              "reservation_update_shortlist",
                              "payments.method.received"
                            ],
                            "items": {
                              "type": "string",
                              "enum": [
                                "guest.created",
                                "guest.deleted",
                                "guest.updated",
                                "listing.new",
                                "listing.updated",
                                "listing.removed",
                                "listing.calendar.updated",
                                "calendar.updated.v2",
                                "payments.failed",
                                "reservation.messageReceived",
                                "reservation.new",
                                "reservation.updated",
                                "reservation.created.v2",
                                "reservation.updated.v2",
                                "reservation.messageSent",
                                "task.created",
                                "task.deleted",
                                "task.updated",
                                "reservation_update_shortlist",
                                "payments.method.received"
                              ]
                            }
                          }
                        }
                      }
                    ]
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
```