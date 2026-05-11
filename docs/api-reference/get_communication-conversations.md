# Get conversations

Get conversations

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
      "name": "Inbox Conversations"
    }
  ],
  "paths": {
    "/communication/conversations": {
      "get": {
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "tags": [
          "Inbox Conversations"
        ],
        "summary": "Get conversations",
        "description": "Get conversations",
        "parameters": [
          {
            "name": "filters",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Array of filters to query by. \n\n **field**: Subject of the filter: `status`, `type`, `guest._id`, `owner._id`, `reservation._id`, `reservation.status`, `read`, `assignee._id`, `listing._id` \n\n **operator**: Enhanced MongoDB comparison operator: `$eq`, `$exists`, `$not`, `$contains`, `$notcontains`, `$gt`, `$lt`, `$between`, `$in`, `$nin` \n\n **value**: Value to filter by",
            "example": "[{\"field\":\"status\", \"operator\":\"$eq\", \"value\": \"OPEN\"}]"
          },
          {
            "name": "fields",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Selection of fields, separated by space",
            "example": "guest reservation status assignee priority createdAt"
          },
          {
            "name": "sort",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Sorting, default: `-createdAt`",
            "example": "-modifiedAt"
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer"
            },
            "description": "Pagination, max: 100, default is: `25`",
            "example": "25"
          },
          {
            "name": "cursorAfter",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Pagination cursor, default:`''`,\n\n `cursorAfter` and `cursorBefore` are not allowed to be used at the same time in one request.\n\n First request will require only limit parameter and in response you will get cursor object. \n\n Use `cursor.after` to send in query params `cursorAfter` parameter in order to move forward. \n\n Use `cursor.before` to send in query params `cursorBefore` parameter in order to move backwards. \n\n An empty string in after or before cursor in response will indicate that there is no more documents in this direction. \n\n If you sort buy something different than `createdAt`, please make sure include this parameter in fields, or you will get empty cursor. \n\n `cursorAfter` and `cursorBefore` are not allowed to be used at the same time in one request.",
            "example": "MjAyMC0wNy0wOVQxMDowMzozOS43ODBaXzVmMDZlYjdiYzVkODk4MDAyYWMwNTM2Nw=="
          },
          {
            "name": "cursorBefore",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Pagination cursor, default:`null`",
            "example": "MjAyMC0wNy0wOVQxMDowMzozOS43ODBaXzVmMDZlYjdiYzVkODk4MDAyYWMwNTM2Nw=="
          },
          {
            "name": "conversation types",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "The conversations API currently supports requests for guest conversations and owners conversations.\n\nThe filter field `type`(guest/ owner, guest by default) is required in order to determine the type of the returned conversations. (in contrast to the guest conversation, owner's contains owner's info)\n\nOwners conversations do not support `airbnb2` module type, messages that sent with `platform` module type will be sent through Email. ",
            "example": "owner"
          }
        ],
        "responses": {
          "200": {
            "description": "OK",
            "headers": {
              "Date": {
                "schema": {
                  "type": "string",
                  "example": "Mon, 11 Oct 2021 13:59:38 GMT"
                }
              },
              "Content-Type": {
                "schema": {
                  "type": "string",
                  "example": "application/json; charset=utf-8"
                }
              },
              "Transfer-Encoding": {
                "schema": {
                  "type": "string",
                  "example": "chunked"
                }
              },
              "Connection": {
                "schema": {
                  "type": "string",
                  "example": "keep-alive"
                }
              },
              "x-request-id": {
                "schema": {
                  "type": "string",
                  "example": "Root=1-61644349-7dc42c2a02aa8f645ba8c342"
                }
              },
              "x-transit-id": {
                "schema": {
                  "type": "string",
                  "example": "78fce5a0-2a9b-11ec-9e88-e1ecf83deceb"
                }
              },
              "X-DNS-Prefetch-Control": {
                "schema": {
                  "type": "string",
                  "example": "off"
                }
              },
              "X-Frame-Options": {
                "schema": {
                  "type": "string",
                  "example": "deny"
                }
              },
              "Strict-Transport-Security": {
                "schema": {
                  "type": "string",
                  "example": "max-age=31536000;includesubdomains"
                }
              },
              "X-Download-Options": {
                "schema": {
                  "type": "string",
                  "example": "noopen"
                }
              },
              "X-Content-Type-Options": {
                "schema": {
                  "type": "string",
                  "example": "nosniff"
                }
              },
              "X-XSS-Protection": {
                "schema": {
                  "type": "string",
                  "example": "1;mode=block"
                }
              },
              "ETag": {
                "schema": {
                  "type": "string",
                  "example": "W/\"5d70-OevskQL1SGVbdHKtiJqpAemTdYw\""
                }
              },
              "Vary": {
                "schema": {
                  "type": "string",
                  "example": "Accept-Encoding"
                }
              },
              "Content-Encoding": {
                "schema": {
                  "type": "string",
                  "example": "gzip"
                }
              },
              "x-content-type": {
                "schema": {
                  "type": "string",
                  "example": "nosniff"
                }
              },
              "x-permitted-cross-domain-policies": {
                "schema": {
                  "type": "string",
                  "example": "none"
                }
              }
            },
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": {
                      "type": "number",
                      "example": 200
                    },
                    "data": {
                      "type": "object",
                      "properties": {
                        "count": {
                          "type": "number",
                          "example": 30
                        },
                        "countUnread": {
                          "type": "number",
                          "example": 2
                        },
                        "fields": {
                          "type": "string",
                          "example": "guest reservation status assignee priority createdAt"
                        },
                        "limit": {
                          "type": "number",
                          "example": 25
                        },
                        "cursor": {
                          "type": "object",
                          "properties": {
                            "after": {
                              "type": "string",
                              "example": ""
                            },
                            "before": {
                              "type": "string",
                              "example": ""
                            }
                          }
                        },
                        "conversations": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "_id": {
                                "type": "string",
                                "example": "6134a49cd450d300307794cb"
                              },
                              "assignee": {
                                "type": "object",
                                "properties": {
                                  "_id": {
                                    "type": "string",
                                    "example": null
                                  }
                                }
                              },
                              "priority": {
                                "type": "number",
                                "example": 10
                              },
                              "meta": {
                                "type": "object",
                                "properties": {
                                  "reservations": {
                                    "type": "array",
                                    "items": {
                                      "type": "object",
                                      "properties": {
                                        "_id": {
                                          "type": "string",
                                          "example": "61347d71d450d300307792a4"
                                        },
                                        "status": {
                                          "type": "string",
                                          "example": "inquiry"
                                        },
                                        "checkIn": {
                                          "type": "string",
                                          "example": "2021-09-04T21:00:00.000Z"
                                        },
                                        "checkOut": {
                                          "type": "string",
                                          "example": "2021-09-05T20:00:00.000Z"
                                        },
                                        "customFields": {
                                          "type": "array",
                                          "items": {}
                                        },
                                        "listing": {
                                          "type": "object",
                                          "properties": {
                                            "tags": {
                                              "type": "array",
                                              "items": {
                                                "type": "string",
                                                "example": "Pool"
                                              }
                                            },
                                            "active": {
                                              "type": "boolean"
                                            },
                                            "_id": {
                                              "type": "string",
                                              "example": "5fba2d97d8e638002d76d842"
                                            },
                                            "picture": {
                                              "type": "object",
                                              "properties": {
                                                "_id": {
                                                  "type": "string",
                                                  "example": "615c0214cdf3370028883d3a"
                                                },
                                                "thumbnail": {
                                                  "type": "string",
                                                  "example": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036872/preprod/5fb67280e39677002e6c2683/ephepadfvgopafgykxrc.jpg"
                                                }
                                              }
                                            },
                                            "address": {
                                              "type": "object",
                                              "properties": {
                                                "full": {
                                                  "type": "string",
                                                  "example": "Loma Mazamitla Sur, La Aurora, 44790 Guadalajara, Jal., Mexico"
                                                },
                                                "city": {
                                                  "type": "string",
                                                  "example": "Guadalajara"
                                                },
                                                "country": {
                                                  "type": "string",
                                                  "example": "Mexico"
                                                },
                                                "state": {
                                                  "type": "string",
                                                  "example": "Jalisco"
                                                }
                                              }
                                            },
                                            "nickname": {
                                              "type": "string",
                                              "example": "OPS-Listing"
                                            },
                                            "title": {
                                              "type": "string",
                                              "example": "TEST"
                                            },
                                            "customFields": {
                                              "type": "array",
                                              "items": {}
                                            }
                                          }
                                        }
                                      }
                                    }
                                  },
                                  "guest": {
                                    "type": "object",
                                    "properties": {
                                      "_id": {
                                        "type": "string",
                                        "example": "61347d70d450d300307792a3"
                                      },
                                      "email": {
                                        "type": "string",
                                        "example": "asdasd@assadsa.com"
                                      },
                                      "isReturning": {
                                        "type": "boolean"
                                      }
                                    }
                                  }
                                }
                              },
                              "accountId": {
                                "type": "string",
                                "example": "5fb67280e39677002e6c2683"
                              },
                              "createdAt": {
                                "type": "string",
                                "example": "2021-09-05T11:06:05.388Z"
                              },
                              "state": {
                                "type": "object",
                                "properties": {
                                  "read": {
                                    "type": "boolean"
                                  },
                                  "status": {
                                    "type": "string",
                                    "example": "OPEN"
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
                "example": {
                  "status": 200,
                  "data": {
                    "count": 30,
                    "countUnread": 2,
                    "fields": "guest reservation status assignee priority createdAt",
                    "limit": 25,
                    "cursor": {
                      "after": "",
                      "before": ""
                    },
                    "conversations": [
                      {
                        "_id": "6134a49cd450d300307794cb",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "61347d71d450d300307792a4",
                              "status": "inquiry",
                              "checkIn": "2021-09-04T21:00:00.000Z",
                              "checkOut": "2021-09-05T20:00:00.000Z",
                              "customFields": [],
                              "listing": {
                                "tags": [
                                  "Pool",
                                  "Resort",
                                  "Another random tag",
                                  "abs",
                                  "San Fransico"
                                ],
                                "active": true,
                                "_id": "5fba2d97d8e638002d76d842",
                                "picture": {
                                  "_id": "615c0214cdf3370028883d3a",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036872/preprod/5fb67280e39677002e6c2683/ephepadfvgopafgykxrc.jpg"
                                },
                                "address": {
                                  "full": "Loma Mazamitla Sur, La Aurora, 44790 Guadalajara, Jal., Mexico",
                                  "city": "Guadalajara",
                                  "country": "Mexico",
                                  "state": "Jalisco"
                                },
                                "nickname": "OPS-Listing",
                                "title": "TEST",
                                "customFields": []
                              }
                            }
                          ],
                          "guest": {
                            "_id": "61347d70d450d300307792a3",
                            "email": "asdasd@assadsa.com",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2021-09-05T11:06:05.388Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "60b337646b754a002f4a1a76",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "60b337636b754a002f4a1a4f",
                              "status": "confirmed",
                              "checkIn": "2022-02-16T04:00:00.000Z",
                              "checkOut": "2022-02-18T23:00:00.000Z",
                              "confirmationCode": "MZQn2A6pm",
                              "customFields": [],
                              "listing": {
                                "tags": [],
                                "active": true,
                                "_id": "5fba2d4cd8e638002d76d7b5",
                                "picture": {
                                  "_id": "615c12f6cdf3370028883d42",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036796/preprod/5fb67280e39677002e6c2683/chuupwehryq36cd43avq.jpg"
                                },
                                "address": {
                                  "full": "150 Las Vegas Blvd N, Las Vegas, NV 89101, USA",
                                  "city": "Las Vegas",
                                  "country": "United States",
                                  "state": "Nevada"
                                },
                                "nickname": "Listing Test1",
                                "title": "Listing Test1",
                                "customFields": []
                              }
                            }
                          ],
                          "guest": {
                            "_id": "60b337616b754a002f4a1a37",
                            "fullName": "Gal Levy",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2021-05-30T06:57:40.575Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "6023bb96151857002f7173de",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "6023bb96151857002f7173da",
                              "status": "confirmed",
                              "checkIn": "2021-02-24T20:00:00.000Z",
                              "checkOut": "2021-02-26T19:00:00.000Z",
                              "customFields": [],
                              "listing": {
                                "tags": [
                                  "Pool",
                                  "Resort",
                                  "Another random tag",
                                  "abs",
                                  "San Fransico"
                                ],
                                "active": true,
                                "_id": "5fba2d97d8e638002d76d842",
                                "picture": {
                                  "_id": "615c0214cdf3370028883d3a",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036872/preprod/5fb67280e39677002e6c2683/ephepadfvgopafgykxrc.jpg"
                                },
                                "address": {
                                  "full": "Loma Mazamitla Sur, La Aurora, 44790 Guadalajara, Jal., Mexico",
                                  "city": "Guadalajara",
                                  "country": "Mexico",
                                  "state": "Jalisco"
                                },
                                "nickname": "OPS-Listing",
                                "title": "TEST",
                                "customFields": []
                              },
                              "confirmationCode": "796O7R0Ny"
                            }
                          ],
                          "guest": {
                            "_id": "6023bb96151857002f7173c4",
                            "fullName": "GuestName GuestLastName",
                            "email": "sadsa.sad@gmail.com",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2021-02-10T10:55:18.922Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "61222fca0b308800307fd92d",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "61222fca0b308800307fd8b1",
                              "status": "confirmed",
                              "checkIn": "2021-08-26T21:00:00.000Z",
                              "checkOut": "2021-08-28T16:00:00.000Z",
                              "customFields": [],
                              "listing": {
                                "tags": [],
                                "active": true,
                                "_id": "61222fb10b308800307fd7c2",
                                "picture": {
                                  "_id": "612b276119a046002822f87f",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1629630380/preprod/5fb67280e39677002e6c2683/itaivtuofjq9fwv0g2ve.jpg"
                                },
                                "address": {
                                  "full": "Rickard Coulee, Stanford, MT 59479, USA",
                                  "city": "Stanford",
                                  "country": "United States",
                                  "state": "Montana"
                                },
                                "nickname": "GaL test 3503",
                                "title": "GaL test 3503",
                                "customFields": []
                              },
                              "confirmationCode": "nRxW923OR"
                            }
                          ],
                          "guest": {
                            "_id": "61222fc80b308800307fd897",
                            "fullName": "gal 3503",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2021-08-22T11:06:50.516Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "6110d84fb0e971002d5f1ca0",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "6110d84eb0e971002d5f1c70",
                              "status": "confirmed",
                              "checkIn": "2022-08-18T05:00:00.000Z",
                              "checkOut": "2022-08-19T00:00:00.000Z",
                              "confirmationCode": "MZwgzlN3Q",
                              "customFields": [],
                              "listing": {
                                "tags": [],
                                "active": true,
                                "_id": "5fba2d4cd8e638002d76d7b5",
                                "picture": {
                                  "_id": "615c12f6cdf3370028883d42",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036796/preprod/5fb67280e39677002e6c2683/chuupwehryq36cd43avq.jpg"
                                },
                                "address": {
                                  "full": "150 Las Vegas Blvd N, Las Vegas, NV 89101, USA",
                                  "city": "Las Vegas",
                                  "country": "United States",
                                  "state": "Nevada"
                                },
                                "nickname": "Listing Test1",
                                "title": "Listing Test1",
                                "customFields": []
                              }
                            }
                          ],
                          "guest": {
                            "_id": "6110d84db0e971002d5f1c5a",
                            "fullName": "yoyo",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2021-08-09T07:25:03.869Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "6110d78fb0e971002d5f1c1d",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "6110d78eb0e971002d5f1c18",
                              "status": "confirmed",
                              "checkIn": "2022-09-06T05:00:00.000Z",
                              "checkOut": "2022-09-08T00:00:00.000Z",
                              "customFields": [],
                              "listing": {
                                "tags": [],
                                "active": true,
                                "_id": "5fba2d4cd8e638002d76d7b5",
                                "picture": {
                                  "_id": "615c12f6cdf3370028883d42",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036796/preprod/5fb67280e39677002e6c2683/chuupwehryq36cd43avq.jpg"
                                },
                                "address": {
                                  "full": "150 Las Vegas Blvd N, Las Vegas, NV 89101, USA",
                                  "city": "Las Vegas",
                                  "country": "United States",
                                  "state": "Nevada"
                                },
                                "nickname": "Listing Test1",
                                "title": "Listing Test1",
                                "customFields": []
                              },
                              "confirmationCode": "6WXyJw9Jz"
                            }
                          ],
                          "guest": {
                            "_id": "6110d78db0e971002d5f1c00",
                            "fullName": "Gal Test",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2021-08-09T07:21:51.166Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "610a558cde8bc1002ecd0a28",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "610a558cde8bc1002ecd0a23",
                              "status": "inquiry",
                              "checkIn": "2022-04-01T04:00:00.000Z",
                              "checkOut": "2022-04-01T23:00:00.000Z",
                              "customFields": [],
                              "listing": {
                                "tags": [],
                                "active": true,
                                "_id": "5fba2d4cd8e638002d76d7b5",
                                "picture": {
                                  "_id": "615c12f6cdf3370028883d42",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036796/preprod/5fb67280e39677002e6c2683/chuupwehryq36cd43avq.jpg"
                                },
                                "address": {
                                  "full": "150 Las Vegas Blvd N, Las Vegas, NV 89101, USA",
                                  "city": "Las Vegas",
                                  "country": "United States",
                                  "state": "Nevada"
                                },
                                "nickname": "Listing Test1",
                                "title": "Listing Test1",
                                "customFields": []
                              }
                            }
                          ],
                          "guest": {
                            "_id": "610a558bde8bc1002ecd0a0d",
                            "fullName": "gga",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2021-08-04T08:53:32.344Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "610a4847de8bc1002ecd09f0",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "610a4847de8bc1002ecd09eb",
                              "status": "inquiry",
                              "checkIn": "2022-03-01T04:00:00.000Z",
                              "checkOut": "2022-03-01T23:00:00.000Z",
                              "customFields": [],
                              "listing": {
                                "tags": [],
                                "active": true,
                                "_id": "5fba2d4cd8e638002d76d7b5",
                                "picture": {
                                  "_id": "615c12f6cdf3370028883d42",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036796/preprod/5fb67280e39677002e6c2683/chuupwehryq36cd43avq.jpg"
                                },
                                "address": {
                                  "full": "150 Las Vegas Blvd N, Las Vegas, NV 89101, USA",
                                  "city": "Las Vegas",
                                  "country": "United States",
                                  "state": "Nevada"
                                },
                                "nickname": "Listing Test1",
                                "title": "Listing Test1",
                                "customFields": []
                              }
                            }
                          ],
                          "guest": {
                            "_id": "610a4846de8bc1002ecd09d5",
                            "fullName": "New res",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2021-08-04T07:56:55.125Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "60f3db61870dff002dd5322f",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "60f3db60870dff002dd531f4",
                              "status": "confirmed",
                              "checkIn": "2021-07-17T21:00:00.000Z",
                              "checkOut": "2021-07-18T20:00:00.000Z",
                              "confirmationCode": "oZVyjLPJL",
                              "customFields": [],
                              "listing": {
                                "tags": [
                                  "Pool",
                                  "Resort",
                                  "Another random tag",
                                  "abs",
                                  "San Fransico"
                                ],
                                "active": true,
                                "_id": "5fba2d97d8e638002d76d842",
                                "picture": {
                                  "_id": "615c0214cdf3370028883d3a",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036872/preprod/5fb67280e39677002e6c2683/ephepadfvgopafgykxrc.jpg"
                                },
                                "address": {
                                  "full": "Loma Mazamitla Sur, La Aurora, 44790 Guadalajara, Jal., Mexico",
                                  "city": "Guadalajara",
                                  "country": "Mexico",
                                  "state": "Jalisco"
                                },
                                "nickname": "OPS-Listing",
                                "title": "TEST",
                                "customFields": []
                              }
                            }
                          ],
                          "guest": {
                            "_id": "60f3db5e870dff002dd531de",
                            "fullName": "ggal ggg",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2021-07-18T07:42:25.130Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "60efdae1d0dcb200322891c3",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "60efdae1d0dcb20032289195",
                              "status": "confirmed",
                              "checkIn": "2021-07-14T21:00:00.000Z",
                              "checkOut": "2021-07-15T20:00:00.000Z",
                              "confirmationCode": "w0V0qJNJg",
                              "customFields": [],
                              "listing": {
                                "tags": [
                                  "Pool",
                                  "Resort",
                                  "Another random tag",
                                  "abs",
                                  "San Fransico"
                                ],
                                "active": true,
                                "_id": "5fba2d97d8e638002d76d842",
                                "picture": {
                                  "_id": "615c0214cdf3370028883d3a",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036872/preprod/5fb67280e39677002e6c2683/ephepadfvgopafgykxrc.jpg"
                                },
                                "address": {
                                  "full": "Loma Mazamitla Sur, La Aurora, 44790 Guadalajara, Jal., Mexico",
                                  "city": "Guadalajara",
                                  "country": "Mexico",
                                  "state": "Jalisco"
                                },
                                "nickname": "OPS-Listing",
                                "title": "TEST",
                                "customFields": []
                              }
                            }
                          ],
                          "guest": {
                            "_id": "60efdae0d0dcb20032289194",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2021-07-15T06:51:13.850Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "60ec9326fd82e0002df75fbb",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "60ec9326fd82e0002df75f8b",
                              "status": "confirmed",
                              "checkIn": "2021-07-12T21:00:00.000Z",
                              "checkOut": "2021-07-13T20:00:00.000Z",
                              "confirmationCode": "r288MvZV2",
                              "customFields": [],
                              "listing": {
                                "tags": [
                                  "Pool",
                                  "Resort",
                                  "Another random tag",
                                  "abs",
                                  "San Fransico"
                                ],
                                "active": true,
                                "_id": "5fba2d97d8e638002d76d842",
                                "picture": {
                                  "_id": "615c0214cdf3370028883d3a",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036872/preprod/5fb67280e39677002e6c2683/ephepadfvgopafgykxrc.jpg"
                                },
                                "address": {
                                  "full": "Loma Mazamitla Sur, La Aurora, 44790 Guadalajara, Jal., Mexico",
                                  "city": "Guadalajara",
                                  "country": "Mexico",
                                  "state": "Jalisco"
                                },
                                "nickname": "OPS-Listing",
                                "title": "TEST",
                                "customFields": []
                              }
                            }
                          ],
                          "guest": {
                            "_id": "60ec9325fd82e0002df75f8a",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2021-07-12T19:08:22.715Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "60ec925efd82e0002df75f53",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "60ec925dfd82e0002df75f32",
                              "status": "confirmed",
                              "checkIn": "2021-07-13T06:00:00.000Z",
                              "checkOut": "2021-07-14T05:00:00.000Z",
                              "confirmationCode": "K8115GjvR",
                              "customFields": [],
                              "listing": {
                                "tags": [],
                                "active": true,
                                "_id": "60eadc10407d16002e6690a3",
                                "picture": {
                                  "_id": "615bfacccdf3370028883d36",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1626004479/preprod/5fb67280e39677002e6c2683/o5exahtjadjvdpzcwa6q.jpg"
                                },
                                "address": {
                                  "full": "Eliezer Kaplan St, Tel Aviv-Yafo, Israel",
                                  "city": "Tel Aviv-Yafo",
                                  "country": "Israel",
                                  "state": "Tel Aviv District"
                                },
                                "nickname": "Maxtst",
                                "title": "maxtst",
                                "customFields": []
                              }
                            }
                          ],
                          "guest": {
                            "_id": "60ec925cfd82e0002df75f31",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2021-07-12T19:05:02.838Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "60eae4f8407d16002e6691bf",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "60eae4f7407d16002e66919e",
                              "status": "confirmed",
                              "checkIn": "2021-07-12T09:00:00.000Z",
                              "checkOut": "2021-07-13T09:00:00.000Z",
                              "confirmationCode": "pZ8QDQz62",
                              "customFields": [],
                              "listing": {
                                "tags": [],
                                "active": true,
                                "_id": "60eadc10407d16002e6690a3",
                                "picture": {
                                  "_id": "615bfacccdf3370028883d36",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1626004479/preprod/5fb67280e39677002e6c2683/o5exahtjadjvdpzcwa6q.jpg"
                                },
                                "address": {
                                  "full": "Eliezer Kaplan St, Tel Aviv-Yafo, Israel",
                                  "city": "Tel Aviv-Yafo",
                                  "country": "Israel",
                                  "state": "Tel Aviv District"
                                },
                                "nickname": "Maxtst",
                                "title": "maxtst",
                                "customFields": []
                              }
                            }
                          ],
                          "guest": {
                            "_id": "60eae4f6407d16002e66919d",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2021-07-11T12:32:56.334Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "60eae3af407d16002e669190",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "60eae3ae407d16002e669172",
                              "status": "confirmed",
                              "checkIn": "2021-07-11T14:30:00.000Z",
                              "checkOut": "2021-07-12T09:00:00.000Z",
                              "confirmationCode": "6WXRpLK1Q",
                              "customFields": [],
                              "listing": {
                                "tags": [],
                                "active": true,
                                "_id": "60eadc10407d16002e6690a3",
                                "picture": {
                                  "_id": "615bfacccdf3370028883d36",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1626004479/preprod/5fb67280e39677002e6c2683/o5exahtjadjvdpzcwa6q.jpg"
                                },
                                "address": {
                                  "full": "Eliezer Kaplan St, Tel Aviv-Yafo, Israel",
                                  "city": "Tel Aviv-Yafo",
                                  "country": "Israel",
                                  "state": "Tel Aviv District"
                                },
                                "nickname": "Maxtst",
                                "title": "maxtst",
                                "customFields": []
                              }
                            }
                          ],
                          "guest": {
                            "_id": "60eae3ad407d16002e669171",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2021-07-11T12:27:27.618Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "60d18683af6c23002f8ce82e",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "60d18682af6c23002f8ce82a",
                              "status": "confirmed",
                              "checkIn": "2021-07-05T05:00:00.000Z",
                              "checkOut": "2021-07-08T00:00:00.000Z",
                              "customFields": [],
                              "listing": {
                                "tags": [
                                  "Pool",
                                  "Resort",
                                  "Another random tag",
                                  "abs",
                                  "San Fransico"
                                ],
                                "active": true,
                                "_id": "5fba2d97d8e638002d76d842",
                                "picture": {
                                  "_id": "615c0214cdf3370028883d3a",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036872/preprod/5fb67280e39677002e6c2683/ephepadfvgopafgykxrc.jpg"
                                },
                                "address": {
                                  "full": "Loma Mazamitla Sur, La Aurora, 44790 Guadalajara, Jal., Mexico",
                                  "city": "Guadalajara",
                                  "country": "Mexico",
                                  "state": "Jalisco"
                                },
                                "nickname": "OPS-Listing",
                                "title": "TEST",
                                "customFields": []
                              },
                              "confirmationCode": "mqQDgWJA3"
                            }
                          ],
                          "guest": {
                            "_id": "60d18681af6c23002f8ce814",
                            "fullName": "gal res gal res",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2021-06-22T06:43:15.266Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "60cb0240689042002fa44c07",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "60cb0240689042002fa44c02",
                              "status": "confirmed",
                              "checkIn": "2021-06-20T05:00:00.000Z",
                              "checkOut": "2021-06-22T00:00:00.000Z",
                              "customFields": [],
                              "listing": {
                                "tags": [],
                                "active": true,
                                "_id": "5fba2d4cd8e638002d76d7b5",
                                "picture": {
                                  "_id": "615c12f6cdf3370028883d42",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036796/preprod/5fb67280e39677002e6c2683/chuupwehryq36cd43avq.jpg"
                                },
                                "address": {
                                  "full": "150 Las Vegas Blvd N, Las Vegas, NV 89101, USA",
                                  "city": "Las Vegas",
                                  "country": "United States",
                                  "state": "Nevada"
                                },
                                "nickname": "Listing Test1",
                                "title": "Listing Test1",
                                "customFields": []
                              },
                              "confirmationCode": "46RX5yWBk"
                            }
                          ],
                          "guest": {
                            "_id": "60cb023f689042002fa44bea",
                            "fullName": "Gal test",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2021-06-17T08:05:20.811Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "60a392f79b9414002e586bff",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "60a392f79b9414002e586bfa",
                              "status": "inquiry",
                              "checkIn": "2021-05-18T05:00:00.000Z",
                              "checkOut": "2021-05-19T00:00:00.000Z",
                              "customFields": [],
                              "listing": {
                                "tags": [],
                                "active": true,
                                "_id": "5fba2d4cd8e638002d76d7b5",
                                "picture": {
                                  "_id": "615c12f6cdf3370028883d42",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036796/preprod/5fb67280e39677002e6c2683/chuupwehryq36cd43avq.jpg"
                                },
                                "address": {
                                  "full": "150 Las Vegas Blvd N, Las Vegas, NV 89101, USA",
                                  "city": "Las Vegas",
                                  "country": "United States",
                                  "state": "Nevada"
                                },
                                "nickname": "Listing Test1",
                                "title": "Listing Test1",
                                "customFields": []
                              }
                            }
                          ],
                          "guest": {
                            "_id": "60a392f79b9414002e586be2",
                            "fullName": "aa2 bbb",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2021-05-18T10:12:07.799Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "607ff12402baa7002efb0bca",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "607ff12402baa7002efb0ba4",
                              "status": "confirmed",
                              "checkIn": "2021-04-21T05:00:00.000Z",
                              "checkOut": "2021-04-22T00:00:00.000Z",
                              "confirmationCode": "w0m0mM1Xg",
                              "customFields": [],
                              "listing": {
                                "tags": [
                                  "Pool",
                                  "Resort",
                                  "Another random tag",
                                  "abs",
                                  "San Fransico"
                                ],
                                "active": true,
                                "_id": "5fba2d97d8e638002d76d842",
                                "picture": {
                                  "_id": "615c0214cdf3370028883d3a",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036872/preprod/5fb67280e39677002e6c2683/ephepadfvgopafgykxrc.jpg"
                                },
                                "address": {
                                  "full": "Loma Mazamitla Sur, La Aurora, 44790 Guadalajara, Jal., Mexico",
                                  "city": "Guadalajara",
                                  "country": "Mexico",
                                  "state": "Jalisco"
                                },
                                "nickname": "OPS-Listing",
                                "title": "TEST",
                                "customFields": []
                              }
                            }
                          ],
                          "guest": {
                            "_id": "607ff12302baa7002efb0ba3",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2021-04-21T09:32:20.969Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "606b1b9ef704f7002d7d0775",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "606b1b9df704f7002d7d0755",
                              "status": "confirmed",
                              "checkIn": "2021-04-05T05:00:00.000Z",
                              "checkOut": "2021-04-06T00:00:00.000Z",
                              "confirmationCode": "gp5rm0Zn9",
                              "customFields": [],
                              "listing": {
                                "tags": [],
                                "active": true,
                                "_id": "5fba2d4cd8e638002d76d7b5",
                                "picture": {
                                  "_id": "615c12f6cdf3370028883d42",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036796/preprod/5fb67280e39677002e6c2683/chuupwehryq36cd43avq.jpg"
                                },
                                "address": {
                                  "full": "150 Las Vegas Blvd N, Las Vegas, NV 89101, USA",
                                  "city": "Las Vegas",
                                  "country": "United States",
                                  "state": "Nevada"
                                },
                                "nickname": "Listing Test1",
                                "title": "Listing Test1",
                                "customFields": []
                              }
                            }
                          ],
                          "guest": {
                            "_id": "606b1b9cf704f7002d7d0731",
                            "fullName": "Alon Eini",
                            "phone": "972503000330",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2021-04-05T14:15:58.319Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "5fbe1a3937fc62002f1d76a2",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "5fbe1a3837fc62002f1d769e",
                              "status": "inquiry",
                              "checkIn": "2020-12-03T15:00:00.000Z",
                              "checkOut": "2020-12-04T10:00:00.000Z",
                              "customFields": [],
                              "listing": {
                                "tags": [
                                  "Pool",
                                  "Resort",
                                  "Another random tag",
                                  "abs",
                                  "San Fransico"
                                ],
                                "active": true,
                                "_id": "5fba2d97d8e638002d76d842",
                                "picture": {
                                  "_id": "615c0214cdf3370028883d3a",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036872/preprod/5fb67280e39677002e6c2683/ephepadfvgopafgykxrc.jpg"
                                },
                                "address": {
                                  "full": "Loma Mazamitla Sur, La Aurora, 44790 Guadalajara, Jal., Mexico",
                                  "city": "Guadalajara",
                                  "country": "Mexico",
                                  "state": "Jalisco"
                                },
                                "nickname": "OPS-Listing",
                                "title": "TEST",
                                "customFields": []
                              }
                            }
                          ],
                          "guest": {
                            "_id": "5fbe1a3737fc62002f1d769d",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2020-11-25T08:47:53.289Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "5fbcfdab2715db002c2824a5",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "5fbcfdaa2715db002c28247e",
                              "status": "confirmed",
                              "checkIn": "2021-01-25T15:00:00.000Z",
                              "checkOut": "2021-01-26T10:00:00.000Z",
                              "confirmationCode": "vQ2JymER5",
                              "customFields": [],
                              "listing": {
                                "tags": [
                                  "Pool",
                                  "Resort",
                                  "Another random tag",
                                  "abs",
                                  "San Fransico"
                                ],
                                "active": true,
                                "_id": "5fba2d97d8e638002d76d842",
                                "picture": {
                                  "_id": "615c0214cdf3370028883d3a",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036872/preprod/5fb67280e39677002e6c2683/ephepadfvgopafgykxrc.jpg"
                                },
                                "address": {
                                  "full": "Loma Mazamitla Sur, La Aurora, 44790 Guadalajara, Jal., Mexico",
                                  "city": "Guadalajara",
                                  "country": "Mexico",
                                  "state": "Jalisco"
                                },
                                "nickname": "OPS-Listing",
                                "title": "TEST",
                                "customFields": []
                              }
                            }
                          ],
                          "guest": {
                            "_id": "5fbcfda92715db002c282462",
                            "email": "yoni+gdcxbsgs@guesty.com",
                            "fullName": "yoni test",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2020-11-24T12:33:47.447Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "5fba2e6dd8e638002d76d997",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "5fba2e6dd8e638002d76d985",
                              "status": "confirmed",
                              "checkIn": "2020-11-18T15:00:00.000Z",
                              "checkOut": "2020-11-25T10:00:00.000Z",
                              "confirmationCode": "ywP2xw2MV",
                              "customFields": [],
                              "listing": {
                                "tags": [],
                                "active": true,
                                "_id": "5fba2d4cd8e638002d76d7b5",
                                "picture": {
                                  "_id": "615c12f6cdf3370028883d42",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036796/preprod/5fb67280e39677002e6c2683/chuupwehryq36cd43avq.jpg"
                                },
                                "address": {
                                  "full": "150 Las Vegas Blvd N, Las Vegas, NV 89101, USA",
                                  "city": "Las Vegas",
                                  "country": "United States",
                                  "state": "Nevada"
                                },
                                "nickname": "Listing Test1",
                                "title": "Listing Test1",
                                "customFields": []
                              }
                            }
                          ],
                          "guest": {
                            "_id": "5fba2e6cd8e638002d76d984",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2020-11-22T09:25:02.014Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "5fba2e2cd8e638002d76d983",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "5fba2e2cd8e638002d76d97a",
                              "status": "reserved",
                              "checkIn": "2020-12-03T15:00:00.000Z",
                              "checkOut": "2020-12-04T10:00:00.000Z",
                              "confirmationCode": "qQxLm7kGD",
                              "customFields": [],
                              "listing": {
                                "tags": [],
                                "active": true,
                                "_id": "5fba2d4cd8e638002d76d7b5",
                                "picture": {
                                  "_id": "615c12f6cdf3370028883d42",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036796/preprod/5fb67280e39677002e6c2683/chuupwehryq36cd43avq.jpg"
                                },
                                "address": {
                                  "full": "150 Las Vegas Blvd N, Las Vegas, NV 89101, USA",
                                  "city": "Las Vegas",
                                  "country": "United States",
                                  "state": "Nevada"
                                },
                                "nickname": "Listing Test1",
                                "title": "Listing Test1",
                                "customFields": []
                              }
                            }
                          ],
                          "guest": {
                            "_id": "5fba2e2cd8e638002d76d964",
                            "fullName": "ESF gdsgs",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2020-11-22T09:23:56.834Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "5fba2db8d8e638002d76d91a",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "5fba2db8d8e638002d76d8f9",
                              "status": "confirmed",
                              "checkIn": "2020-11-22T15:00:00.000Z",
                              "checkOut": "2020-11-23T10:00:00.000Z",
                              "confirmationCode": "jYR6Nqn3B",
                              "customFields": [],
                              "listing": {
                                "tags": [
                                  "Pool",
                                  "Resort",
                                  "Another random tag",
                                  "abs",
                                  "San Fransico"
                                ],
                                "active": true,
                                "_id": "5fba2d97d8e638002d76d842",
                                "picture": {
                                  "_id": "615c0214cdf3370028883d3a",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036872/preprod/5fb67280e39677002e6c2683/ephepadfvgopafgykxrc.jpg"
                                },
                                "address": {
                                  "full": "Loma Mazamitla Sur, La Aurora, 44790 Guadalajara, Jal., Mexico",
                                  "city": "Guadalajara",
                                  "country": "Mexico",
                                  "state": "Jalisco"
                                },
                                "nickname": "OPS-Listing",
                                "title": "TEST",
                                "customFields": []
                              }
                            }
                          ],
                          "guest": {
                            "_id": "5fba2db7d8e638002d76d8f8",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2020-11-22T09:22:00.409Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      },
                      {
                        "_id": "5fba2da6d8e638002d76d8f7",
                        "assignee": {
                          "_id": null
                        },
                        "priority": 10,
                        "meta": {
                          "reservations": [
                            {
                              "_id": "5fba2da5d8e638002d76d8d1",
                              "status": "confirmed",
                              "checkIn": "2020-12-03T15:00:00.000Z",
                              "checkOut": "2020-12-04T10:00:00.000Z",
                              "confirmationCode": "pZYLlgr7N",
                              "customFields": [],
                              "listing": {
                                "tags": [
                                  "Pool",
                                  "Resort",
                                  "Another random tag",
                                  "abs",
                                  "San Fransico"
                                ],
                                "active": true,
                                "_id": "5fba2d97d8e638002d76d842",
                                "picture": {
                                  "_id": "615c0214cdf3370028883d3a",
                                  "thumbnail": "https://res.cloudinary.com/guesty/image/upload/c_fit,h_200/v1606036872/preprod/5fb67280e39677002e6c2683/ephepadfvgopafgykxrc.jpg"
                                },
                                "address": {
                                  "full": "Loma Mazamitla Sur, La Aurora, 44790 Guadalajara, Jal., Mexico",
                                  "city": "Guadalajara",
                                  "country": "Mexico",
                                  "state": "Jalisco"
                                },
                                "nickname": "OPS-Listing",
                                "title": "TEST",
                                "customFields": []
                              }
                            }
                          ],
                          "guest": {
                            "_id": "5fba2da5d8e638002d76d8d0",
                            "isReturning": false
                          }
                        },
                        "accountId": "5fb67280e39677002e6c2683",
                        "createdAt": "2020-11-22T09:21:42.240Z",
                        "state": {
                          "read": false,
                          "status": "OPEN"
                        }
                      }
                    ]
                  }
                }
              }
            }
          },
          "404": {
            "description": "Conversations not found",
            "content": {}
          },
          "500": {
            "description": "Internal Server Error",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "error": {
                      "type": "object",
                      "properties": {
                        "message": {
                          "type": "string"
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